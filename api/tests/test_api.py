import hashlib

from tests.conftest import make_wav


def _project(client, name="Song"):
    r = client.post("/v1/projects", json={"name": name})
    assert r.status_code == 201
    return r.json()


def test_health(client):
    assert client.get("/healthz").json() == {"status": "ok"}


def test_project_crud(client):
    p = _project(client, "  My Song ")
    assert p["name"] == "My Song"
    assert client.get(f"/v1/projects/{p['id']}").json()["assets"] == []
    assert (
        client.patch(f"/v1/projects/{p['id']}", json={"name": "Renamed"}).json()["name"]
        == "Renamed"
    )
    assert [x["id"] for x in client.get("/v1/projects").json()] == [p["id"]]
    assert client.delete(f"/v1/projects/{p['id']}").status_code == 204
    assert client.get(f"/v1/projects/{p['id']}").status_code == 404


def test_rejects_blank_name(client):
    assert client.post("/v1/projects", json={"name": ""}).status_code == 422


def test_upload_wav_stores_immutable_original(client):
    p = _project(client)
    data = make_wav(0.5)
    r = client.post(
        f"/v1/projects/{p['id']}/vocal",
        files={"file": ("take1.wav", data, "audio/wav")},
    )
    assert r.status_code == 201
    a = r.json()
    assert a["sha256"] == hashlib.sha256(data).hexdigest()
    assert a["immutable"] is True and a["kind"] == "vocal"
    assert a["duration_s"] == 0.5
    stored = client.storage_dir / "assets" / a["sha256"][:2] / a["sha256"]
    assert stored.read_bytes() == data
    assert not (stored.stat().st_mode & 0o222), "stored original must be read-only"


def test_asset_content_streams_with_range(client):
    p = _project(client)
    data = make_wav(0.5)
    a = client.post(
        f"/v1/projects/{p['id']}/vocal", files={"file": ("t.wav", data, "audio/wav")}
    ).json()
    full = client.get(f"/v1/assets/{a['id']}/content")
    assert full.status_code == 200 and full.content == data
    part = client.get(f"/v1/assets/{a['id']}/content", headers={"Range": "bytes=0-9"})
    assert part.status_code == 206 and part.content == data[:10]


def test_upload_rejects_non_audio_and_empty(client):
    p = _project(client)
    url = f"/v1/projects/{p['id']}/vocal"
    assert (
        client.post(
            url, files={"file": ("x.wav", b"not audio at all", "audio/wav")}
        ).status_code
        == 415
    )
    assert (
        client.post(url, files={"file": ("x.wav", b"", "audio/wav")}).status_code == 415
    )


def test_upload_rejects_oversize(client):
    p = _project(client)
    big = make_wav(10)  # > 64 KiB test limit
    r = client.post(
        f"/v1/projects/{p['id']}/vocal", files={"file": ("big.wav", big, "audio/wav")}
    )
    assert r.status_code == 413
    assert list((client.storage_dir / "tmp").iterdir()) == []


def test_upload_to_missing_project(client):
    r = client.post(
        "/v1/projects/nope/vocal", files={"file": ("a.wav", make_wav(), "audio/wav")}
    )
    assert r.status_code == 404


def test_identical_upload_is_deduplicated_and_delete_keeps_shared_file(client):
    p1, p2 = _project(client, "a"), _project(client, "b")
    data = make_wav(0.25)
    for p in (p1, p2):
        client.post(
            f"/v1/projects/{p['id']}/vocal",
            files={"file": ("t.wav", data, "audio/wav")},
        )
    sha = hashlib.sha256(data).hexdigest()
    stored = client.storage_dir / "assets" / sha[:2] / sha
    client.delete(f"/v1/projects/{p1['id']}")
    assert stored.exists(), "file still referenced by project b"
    client.delete(f"/v1/projects/{p2['id']}")
    assert not stored.exists()
