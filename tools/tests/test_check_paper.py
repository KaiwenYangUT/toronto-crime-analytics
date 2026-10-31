"""Content-page rule: pages before the first "References" page count, References are free."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import check_page_count as cpc
import check_paper_pdf as cpp


def fake_pdf(monkeypatch, pages: list[str]) -> str:
    monkeypatch.setattr(cpc, "page_count", lambda pdf: len(pages))
    monkeypatch.setattr(cpc, "page_text", lambda pdf, i: pages[i - 1])
    return "fake.pdf"


def paper(content: int, refs: int = 1) -> list[str]:
    return [f"Body text of page {i}" for i in range(1, content + 1)] + (
        ["\n  References\nA. Author. Title."] + ["more references"] * (refs - 1) if refs else []
    )


def test_six_content_pages_plus_references_ok(monkeypatch):
    problems, notes = cpc.check(fake_pdf(monkeypatch, paper(6)))
    assert problems == []
    assert not any(n.startswith("WARN") for n in notes)
    assert "6 content pages + references" in notes[0]


def test_seven_content_pages_ok_with_warning(monkeypatch):
    problems, notes = cpc.check(fake_pdf(monkeypatch, paper(7)))
    assert problems == []
    assert any(n.startswith("WARN") for n in notes)


def test_eight_content_pages_fails(monkeypatch):
    problems, _ = cpc.check(fake_pdf(monkeypatch, paper(8)))
    assert problems and "8 content pages" in problems[0]


def test_no_references_page_fails(monkeypatch):
    problems, _ = cpc.check(fake_pdf(monkeypatch, paper(6, refs=0)))
    assert problems and "References" in problems[0]


def test_total_pages_not_limited(monkeypatch):
    problems, _ = cpc.check(fake_pdf(monkeypatch, paper(5, refs=6)))
    assert problems == []


def test_references_word_mid_page_is_not_a_heading(monkeypatch):
    pages = ["Intro", "See References below", "More"] + paper(0)[:0] + ["References\nx"]
    assert cpc.references_page(fake_pdf(monkeypatch, pages)) == 4


def test_paper_pdf_check_reports_page_problems(monkeypatch, capsys):
    pdf = fake_pdf(monkeypatch, paper(8))

    # fonts/text checks need a real PDF; stub the subprocess layer to a clean PDF
    class R:
        stdout = "name type emb sub uni object ID\n---\nSourceSerif4-Regular CID yes yes yes 1 0\nInter-Regular CID yes yes yes 2 0\n"

    def run(cmd, **kw):
        r = R()
        if cmd[0] == "pdftotext":
            r.stdout = " ".join(cpp.FIGURE_TEXT)
        return r

    monkeypatch.setattr(cpp.subprocess, "run", run)
    assert cpp.main(pdf, 7) == 1
    assert "8 content pages exceeds the limit of 7" in capsys.readouterr().out
    pdf = fake_pdf(monkeypatch, paper(6))
    assert cpp.main(pdf, 7) == 0
