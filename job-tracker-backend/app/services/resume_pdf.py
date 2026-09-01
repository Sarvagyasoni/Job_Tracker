"""Renders structured resume content (see EnhancedResumeContent in
app.schemas) into an actual downloadable PDF, using reportlab.

Kept separate from the LLM client and router so the rendering logic can be
tested on its own with plain Python data, no API key or running server
needed.
"""

import io
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer

from app.schemas import ResumeSection

_PAGE_MARGIN = 0.75 * inch
_TOP_BOTTOM_MARGIN = 0.6 * inch
_SECTION_SPACING = 14


def _escaped_paragraph(text: str, style) -> Paragraph:
    """Every piece of resume text comes from an LLM and could contain
    characters like <, >, or & (e.g. "improved performance by >20%",
    "worked with R&D", a company name in angle brackets). reportlab's
    Paragraph interprets its input as a small XML dialect, and an
    unescaped '<word>' is silently swallowed as an unrecognized tag -
    the text inside it just vanishes from the rendered PDF. Escaping
    first is not optional here; verified this exact failure mode before
    adding this wrapper."""
    return Paragraph(escape(text), style)


def render_resume_pdf(sections: list[ResumeSection]) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        topMargin=_TOP_BOTTOM_MARGIN,
        bottomMargin=_TOP_BOTTOM_MARGIN,
        leftMargin=_PAGE_MARGIN,
        rightMargin=_PAGE_MARGIN,
    )
    styles = getSampleStyleSheet()

    story = []
    for section in sections:
        story.append(_escaped_paragraph(section.heading, styles["Heading2"]))

        if section.paragraph:
            story.append(_escaped_paragraph(section.paragraph, styles["BodyText"]))

        if section.bullet_points:
            items = [
                ListItem(_escaped_paragraph(bullet, styles["BodyText"]))
                for bullet in section.bullet_points
            ]
            story.append(ListFlowable(items, bulletType="bullet"))

        story.append(Spacer(1, _SECTION_SPACING))

    doc.build(story)
    return buffer.getvalue()