"""Integrity failures must never silently replace or bless an input file."""

import hashlib
import importlib.util
import io
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location(
    "fetch_data", Path(__file__).resolve().parents[1] / "fetch_data.py"
)
fetch_data = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetch_data)


@pytest.fixture
def inputs(tmp_path):
    raw, reference = tmp_path / "raw", tmp_path / "reference"
    raw.mkdir()
    reference.mkdir()
    content = b"category,value\nRobbery,1\n"
    entry = {
        "file": "input (snapshot).csv",
        "bytes": len(content),
        "md5": hashlib.md5(content).hexdigest(),
        "sha256": hashlib.sha256(content).hexdigest(),
    }
    return raw, reference, content, entry


def test_corrupt_cached_input_is_not_overwritten(inputs):
    raw, reference, content, entry = inputs
    (reference / entry["file"]).write_bytes(content)
    destination = raw / entry["file"]
    destination.write_bytes(b"corrupt")
    with pytest.raises(ValueError, match="Checksum mismatch"):
        fetch_data.fetch(entry, raw, reference, "https://example.invalid/")
    assert destination.read_bytes() == b"corrupt"
    assert not (raw / f"{entry['file']}.part").exists()


def test_modified_reference_stops_before_copy(inputs):
    raw, reference, _, entry = inputs
    (reference / entry["file"]).write_bytes(b"unexpected")
    with pytest.raises(ValueError, match="Checksum mismatch"):
        fetch_data.fetch(entry, raw, reference, "https://example.invalid/")
    assert list(raw.iterdir()) == []


def test_reuses_verified_partial_after_interruption(inputs):
    raw, reference, content, entry = inputs
    (raw / f"{entry['file']}.part").write_bytes(content)
    assert fetch_data.fetch(entry, raw, reference, "https://example.invalid/").startswith("resumed")
    assert (raw / entry["file"]).read_bytes() == content


def test_pinned_download_escapes_filename_and_verifies(inputs, monkeypatch):
    raw, reference, content, entry = inputs
    calls = []

    def download(url, timeout):
        calls.append((url, timeout))
        return io.BytesIO(content)

    monkeypatch.setattr(fetch_data, "urlopen", download)
    fetch_data.fetch(entry, raw, reference, "https://example.invalid/pinned-sha/")
    assert calls == [("https://example.invalid/pinned-sha/input%20%28snapshot%29.csv", 120)]
    assert (raw / entry["file"]).read_bytes() == content


def test_sha256_mismatch_stops_even_when_size_and_md5_match(inputs):
    raw, reference, content, entry = inputs
    (reference / entry["file"]).write_bytes(content)
    entry["sha256"] = "0" * 64
    with pytest.raises(ValueError, match="sha256"):
        fetch_data.fetch(entry, raw, reference, "https://example.invalid/")
    assert list(raw.iterdir()) == []
