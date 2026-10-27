#!/usr/bin/env python3
"""Add new GitHub projects to the portfolio. Run every week by .github/workflows/auto-projects.yml (on the main branch).

Looks at every public repository of USER, decides whether it is a real project, and keeps a block of cards in the
Projects section of batman.html up to date - the pirate world reads the same cards, so it gets them too. Each new card
gets a picture in images/projects/ (the README's first screenshot, else a title card drawn in the site's colours) plus
its WebP copies (see make-thumbs.py), and pirate/batman-snapshot.js is refreshed.

    pip install pillow
    python tools/auto-projects.py --dry-run     # report only, change nothing
    python tools/auto-projects.py               # update the page, then commit what changed

GITHUB_TOKEN is optional (the workflow sets it); a normal run needs about ten GitHub API requests, well inside the
60/hour allowed without one.

Which repositories become cards
  never      the profile repo, this site, empty or template repos, forks you made no commits in, repos with the topic
             `not-portfolio`, and anything the page already links to outside the block (matched by repo id, so renamed
             repos count, and a repo whose demo URL is already on the page counts too)
  always     repos with the topic `portfolio`
  otherwise  a score: a live demo, a real description, README length, project-style README sections (Features,
             Installation, Usage...), a screenshot, topics and project words (app, system, tool...) count for it;
             notes / practice / lab-work / collection-of-things repos count against it. ADD_AT or more -> added.
             Close calls are listed in the run summary and NOT added - give them the `portfolio` topic to add them.

A repo is judged again only when it changes (push, description, demo URL or topics), so a project that starts as a
bare repo is picked up in the week its README lands. Once added, a card stays until the repo is deleted, made private,
tagged `not-portfolio`, or linked somewhere else on the page.

The block sits between the two `auto-projects` marker comments in #projects-grid (first run: right after the three
featured cards, so it is behind See More). It is rewritten on every run, newest repo first - move the markers to move
the block. To hand-edit a card, move it out of the block: a repo linked anywhere else on the page is never shown twice.
"""
import argparse
import datetime
import hashlib
import html
import importlib.util
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from PIL import Image, ImageDraw, ImageFont

USER = 'Shiva-Prasad-Sarkar'
SITE_REPO = 'Portfolio-Website'
ADD_AT = 4          # score needed to become a card
CLOSE_AT = 1        # ADD_AT > score >= CLOSE_AT is reported as a close call
HEARTBEAT_DAYS = 30  # GitHub switches a schedule off after 60 days without commits, so the state is rewritten this often

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGE = os.path.join(ROOT, 'batman.html')
STATE = os.path.join(ROOT, 'tools', 'auto-projects-state.json')
IMG_DIR = 'images/projects'
PAD = ' ' * 8
START = '<!-- auto-projects:start - the cards up to the end marker are written by tools/auto-projects.py -->'
END = '<!-- auto-projects:end -->'
BLOCK = re.compile(r'(<!-- auto-projects:start\b.*?-->)(.*?)(<!-- auto-projects:end -->)', re.S)

API = 'https://api.github.com'
TOKEN = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
README_NAMES = ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README.markdown', 'README.rst', 'README.txt', 'README']

sys.dont_write_bytecode = True  # no tools/__pycache__ for the workflow to commit
_spec = importlib.util.spec_from_file_location('make_thumbs', os.path.join(os.path.dirname(__file__), 'make-thumbs.py'))
thumbs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(thumbs)

# ------------------------------------------------------------------ judging
PROJECT_WORDS = re.compile(
    r'\b(apps?|application|system|platform|tool|utility|script|website|portal|simulat\w*|classif\w*|detect\w*|'
    r'predict\w*|implementation|engine|game|bot|dashboard|monitor\w*|generator|compiler|interpreter|file ?system|'
    r'api|extension|plugin|pipeline|analy[sz]\w*|tracker|manager|management|finder|calculator|visuali[sz]\w*|'
    r'robot\w*|model|network|circuit)\b', re.I)
NOT_A_PROJECT = [  # checked against the repo name and description
    r'\bnotes\b(?! (?:app|application|manager|system|tool|website|platform))',
    r'(?<!best )\bpracti[cs](?:e|es|ed|ing)\b',
    r'\blearning (?:java|python|c\+\+|javascript|js|react|sql|go|rust|dsa)\b|'
    r'\b(?:java|python|javascript|react|sql|go|rust|dsa)[ _-]learning\b',
    r'\bexercises?\b',
    r'\bassignments?\b(?! (?:app|application|manager|management|system|tracker|tool|portal|platform|submission))',
    r'\blab (?:work|tasks?|reports?|codes?|projects?|assignments?|exercises?|sessions?)\b|\bcse[ _-]*lab\b|\blabs\b',
    r'\b(?:a|an|my)\s+(?:\w+\s+){0,2}(?:collection|archive|bunch) of\b|\bvariety of\b',
    r'\bhere i (?:have )?(?:store|stored|keep|kept|save|saved|put)\b|\bi (?:store|stored|saved|keep)\b',
    r'\bmy daily\b|\bonline[ _-]?judges?\b|\bleetcode\b|\bcodeforces?\b|\bhackerrank\b|\bproblem[ _-]solving\b',
    r'\btutorials?\b|\bcheat ?sheets?\b|\bdotfiles\b|\bconfig files\b|\bcourse ?work\b|\bplayground\b',
]
COLLECTION_NAME = re.compile(
    r'(?:^|[-_ ])(projects|games|programs|codes|solutions|scripts|sketches|notebooks|snippets|exercises|labs)$', re.I)
SECTION_WORDS = re.compile(
    r'\b(features?|what it does|installation|install|setup|getting started|quick ?start|usage|how to (?:run|use)|'
    r'how it works|tech stack|technologies|built with|screenshots?|demo|architecture|results?|project structure|'
    r'prerequisites|requirements|dependencies|methodology|dataset|model|evaluation|implementation|components|'
    r'hardware|circuit|deployment|configuration|build(?:ing)?|running|testing)\b', re.I)
THIS_PROJECT = re.compile(r'\bthis (?:project|app|application|tool|system|platform|website)\b', re.I)
BADGE = re.compile(r'shields\.io|badgen|badge|/workflows/|travis-ci|codecov|readme-stats|readme-typing|komarev|'
                   r'visitor|skillicons|devicon|simpleicons|\.svg(?:$|\?)|^data:', re.I)
FENCE = re.compile(r'^ {0,3}(```|~~~).*?^ {0,3}\1', re.S | re.M)
EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿⬀-⯿️‍]')
GENERIC_TITLES = {'readme', 'about', 'introduction', 'overview', 'project', 'project title', 'title'}
SMALL_WORDS = {'a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'vs'}


class RateLimited(Exception):
    pass


def get(url, api=False, limit=15 << 20, tries=3):
    """GET url -> bytes, or None when it does not exist. The token is only ever sent to api.github.com."""
    headers = {'User-Agent': 'portfolio-auto-projects'}
    if api:
        headers.update({'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'})
        if TOKEN:
            headers['Authorization'] = 'Bearer ' + TOKEN
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as r:
            data = r.read(limit + 1)
    except urllib.error.HTTPError as e:
        if e.code in (404, 410, 451):
            return None
        if e.code in (403, 429) and e.headers.get('x-ratelimit-remaining') == '0':
            raise RateLimited('GitHub API limit reached - set GITHUB_TOKEN or try again in an hour') from e
        if e.code in (429, 502, 503, 504) and tries > 1:  # e.g. the social preview service throttles bursts
            time.sleep(min(int(e.headers.get('retry-after') or 0) or 10 * (4 - tries), 30))
            return get(url, api, limit, tries - 1)
        raise
    if len(data) > limit:
        raise ValueError(f'more than {limit >> 20} MB: {url}')
    return data


def api(path):
    data = get(API + path, api=True)
    if data is None:
        return None
    return json.loads(data) if data.strip() else []  # 204 (e.g. contributors of an empty repo)


def list_repos():
    repos, page = [], 1
    while True:
        batch = api(f'/users/{USER}/repos?type=owner&per_page=100&page={page}') or []
        repos += batch
        if len(batch) < 100:
            return repos
        page += 1


def readme(repo):
    """-> (markdown, base URL for its relative links); ('', base) when the repo has none."""
    base = f'https://raw.githubusercontent.com/{repo["full_name"]}/{urllib.parse.quote(repo["default_branch"])}/'
    for name in README_NAMES:
        data = get(base + name)
        if data is not None:
            return data.decode('utf-8', 'replace'), base
    return '', base


def plain(text):
    """Markdown/HTML fragment -> one line of plain text."""
    s = re.sub(r'<!--.*?-->', ' ', text, flags=re.S)
    s = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', s)
    s = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', s)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = re.sub(r'\*\*|__|~~|`|(?<!\w)[*_]|[*_](?!\w)', '', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def squash(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())


def humanize(name):
    words = [w for w in re.split(r'[-_\s]+', name) if w]
    out = []
    for i, w in enumerate(words):
        if i and w.lower() in SMALL_WORDS:
            out.append(w.lower())
        else:
            out.append(w[0].upper() + w[1:] if w.islower() else w)
    return ' '.join(out)


def shorten(text, limit=300):
    if len(text) <= limit:
        return text
    cut = text.rfind('. ', 0, limit)
    return text[:cut + 1] if cut > limit // 2 else text[:limit].rsplit(' ', 1)[0] + '…'


def title_of(repo, md):
    """The README's top heading when it is a real title, else the repo name made readable."""
    top = '\n'.join(FENCE.sub('', md).strip().splitlines()[:15])  # a heading further down is not the title
    m = (re.search(r'^ {0,3}#[ \t]+(.+?)[ \t#]*$', top, re.M)
         or re.search(r'<h1[^>]*>(.*?)</h1>', top, re.S | re.I)
         or re.search(r'^(\S.*)\n=+[ \t]*$', top, re.M))
    t = EMOJI.sub('', plain(m.group(1))) if m else ''
    t = re.sub(r'^[\W_]+|[^\w)!?+#]+$', '', t).strip()
    if not (3 <= len(t) <= 80) or not re.search('[A-Za-z]', t) or t.lower() in GENERIC_TITLES:
        return humanize(repo['name'])
    if squash(t) == squash(repo['name']) and (t.islower() or re.search('[-_]', t)):
        return humanize(repo['name'])  # the heading only repeats the repo name
    return t


def summary_of(repo, md):
    """The repo description, or the README's first real paragraph when the description is missing or tiny."""
    desc = (repo.get('description') or '').strip()
    if len(desc) >= 25:
        return shorten(desc)
    for block in re.split(r'\n\s*\n', FENCE.sub('', md)):
        b = block.strip()
        if not b or re.match(r'#|\||>|[-*+] |\d+\. |=|---', b) or re.search(r'\n[=-]{3,}\s*$', b):
            continue
        t = plain(b)
        if len(t) >= 40 and len(t.split()) >= 6:
            return shorten(t)
    return desc or humanize(repo['name'])


def readme_images(md, base):
    found = []
    pattern = r'!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^)\s]+))|<img\b[^>]*?\bsrc=["\']([^"\']+)'
    for m in re.finditer(pattern, FENCE.sub('', md), re.I):
        u = (m.group(1) or m.group(2) or m.group(3)).strip()
        if BADGE.search(u):
            continue
        u = urllib.parse.quote(u, safe=":/?&=%#+@,;~!$'()*")  # e.g. spaces in a relative path
        u = base + u.lstrip('/') if u.startswith('/') and not u.startswith('//') else urllib.parse.urljoin(base, u)
        u = re.sub(r'^https://github\.com/([^/]+/[^/]+)/(?:blob|raw)/', r'https://raw.githubusercontent.com/\1/', u)
        if u.startswith(('https://', 'http://')) and u not in found:
            found.append(u)
    return found


def readme_sections(md):
    """Project-style sections (Features, Installation, Usage...), written as headings or as short label lines."""
    found = set()
    for line in FENCE.sub('', md).splitlines():
        heading = re.match(r' {0,3}#{1,6}[ \t]+(.*)', line)
        label = heading.group(1) if heading else line.strip().strip('*_').strip()
        if not heading and (len(label) > 40 or re.search(r'[.!?,;|`]', label.rstrip(':'))):
            continue
        m = SECTION_WORDS.search(label)
        if m:
            found.add(m.group(1).lower())
    return sorted(found)


def judge(repo, md, base):
    """-> (score, reasons) for a repo that passed the hard rules."""
    score, why = 0, []

    def add(points, reason):
        nonlocal score
        score += points
        why.append(f'{points:+d} {reason}')

    text = humanize(repo['name']) + ' ' + (repo.get('description') or '')
    if demo_url(repo):
        add(2, 'live demo')
    desc = (repo.get('description') or '').strip()
    if len(desc) >= 80:
        add(2, 'detailed description')
    elif len(desc) >= 25:
        add(1, 'description')
    else:
        add(-1, 'no description')
    words = len(plain(FENCE.sub('', md)).split())
    if not md:
        add(-1, 'no README')
    elif words >= 250:
        add(2, f'README {words} words')
    elif words >= 80:
        add(1, f'README {words} words')
    elif words < 30:
        add(-1, f'README only {words} words')
    sections = readme_sections(md)
    if sections:
        add(2 if len(sections) >= 3 else 1, 'README sections: ' + ', '.join(sections[:4]))
    if THIS_PROJECT.search(md):
        add(1, 'README says "this project/app/tool"')
    if readme_images(md, base):
        add(1, 'image in README')
    if repo.get('topics'):
        add(1, 'topics')
    m = PROJECT_WORDS.search(text)
    if m:
        add(1, f'project word "{m.group(0)}"')
    for pattern in NOT_A_PROJECT:
        m = re.search(pattern, text, re.I)
        if m:
            add(-4, f'notes/practice/collection wording "{m.group(0)}"')
            break
    if COLLECTION_NAME.search(repo['name']):
        add(-2, 'name sounds like a collection')
    return score, why


def norm_url(u):
    u = re.sub(r'^https?://(www\.)?', '', (u or '').strip().lower())
    return u.split('#')[0].rstrip('/')


def demo_url(repo):
    u = (repo.get('homepage') or '').strip()
    if not u or 'github.com/' in u:
        return ''
    return u if re.match(r'https?://', u) else 'https://' + u


def fingerprint(repo):
    """Changes whenever something the verdict depends on changes."""
    key = [repo['pushed_at'], repo.get('description'), repo.get('homepage'), sorted(repo.get('topics') or [])]
    return hashlib.sha1(json.dumps(key).encode()).hexdigest()[:12]


def linked_repo_ids(text, by_name, aliases):
    """Ids of the repos the page links to. Old names of renamed repos are looked up once (GitHub redirects them to
    the repo under its new name) and remembered in `aliases`; None marks a link to a repo that no longer exists."""
    ids = set()
    for name in set(re.findall(r'github\.com/' + re.escape(USER) + r'/([\w.-]+)', text, re.I)):
        key = re.sub(r'\.git$', '', name).lower()
        if key in by_name:
            ids.add(by_name[key]['id'])
            continue
        if key not in aliases:
            aliases[key] = (api(f'/repos/{USER}/{key}') or {}).get('id')
        if aliases[key]:
            ids.add(aliases[key])
    return ids


def hard_rule(repo, topics, linked, page_urls):
    """-> why the repo can never be a card here, or None."""
    name = repo['name'].lower()
    if name == USER.lower():
        return 'profile README repo'
    if name == SITE_REPO.lower():
        return 'this portfolio'
    if 'not-portfolio' in topics:
        return 'topic not-portfolio'
    if repo['id'] in linked:
        return 'already on the page'
    if norm_url(repo.get('homepage')) and norm_url(repo.get('homepage')) in page_urls:
        return 'already on the page (demo link)'
    if repo.get('is_template'):
        return 'template repo'
    if not repo.get('size'):
        return 'empty'
    return None


def fork_rule(repo, page_urls):
    """Forks (team projects are often forks) count only when you have commits in them."""
    parent = (api(f'/repos/{repo["full_name"]}') or {}).get('parent') or {}
    if parent and norm_url(parent.get('html_url')) in page_urls:
        return 'upstream repo already on the page'
    people = api(f'/repos/{repo["full_name"]}/contributors?per_page=100') or []
    if not any(p.get('login', '').lower() == USER.lower() for p in people):
        return 'fork without your commits'
    return None


# ------------------------------------------------------------------ cards
def font(bold, size):
    names = ['DejaVuSans-Bold.ttf', 'arialbd.ttf', 'segoeuib.ttf'] if bold else ['DejaVuSans.ttf', 'arial.ttf', 'segoeui.ttf']
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size)


def wrap(draw, text, fnt, width):
    lines, line = [], ''
    for word in text.split():
        trial = (line + ' ' + word).strip()
        if line and draw.textlength(trial, font=fnt) > width:
            lines.append(line)
            line = word
        else:
            line = trial
    return lines + [line]


def fit(draw, text, fnt, width):
    """text, cut short with an ellipsis when it is wider than width."""
    if draw.textlength(text, font=fnt) <= width:
        return text
    while text and draw.textlength(text + '…', font=fnt) > width:
        text = text[:-1]
    return text + '…'


def title_card(repo, title):
    """A picture in the site's colours for a repo without screenshots - 16:10, the shape of a card image."""
    w, h, left = 1280, 800, 120
    im = Image.new('RGB', (w, h))
    draw = ImageDraw.Draw(im)
    top, bottom = (0x10, 0x13, 0x1b), (0x05, 0x06, 0x0a)  # --card fading into --sk-near
    for y in range(h):
        draw.line([(0, y), (w, y)], fill=tuple(round(a + (b - a) * y / h) for a, b in zip(top, bottom)))
    for size in (84, 72, 62, 54):
        big = font(True, size)
        lines = wrap(draw, title, big, w - 2 * left)
        if len(lines) <= 3:
            break
    if len(lines) > 3:
        lines = lines[:2] + [lines[2] + '…']
    small = font(False, 30)
    topics = [t for t in repo.get('topics') or [] if t not in ('portfolio', 'not-portfolio')]
    eyebrow = ' · '.join([repo.get('language') or 'Project'] + topics[:2]).upper()
    step = round(size * 1.2)
    y = y0 = (h - (66 + len(lines) * step + 66)) // 2 - 30  # a little above the middle: cards darken the bottom
    draw.text((left, y), fit(draw, eyebrow, small, w - 2 * left), font=small, fill='#ffd24a')
    y += 66
    for line in lines:
        draw.text((left, y), line, font=big, fill='#eef0f5')
        y += step
    draw.rectangle([left - 40, y0, left - 32, y - round(size * 0.2)], fill='#ffc928')
    draw.text((left, y + 36), fit(draw, f'github.com/{repo["full_name"]}', small, w - 2 * left), font=small, fill='#8f97a9')
    return im


def pick_picture(repo, md, base, title):
    """-> (source, image): the first real picture of the README, else a title card drawn here."""
    for url in readme_images(md, base)[:5]:
        try:
            data = get(url)
            if not data:
                continue
            im = Image.open(io.BytesIO(data))
            im.load()
        except Exception:
            continue
        if im.width >= 320 and im.height >= 160 and 1.0 <= im.width / im.height <= 3.2:  # fits a card
            return url, im
    return 'title card', title_card(repo, title)


def save_picture(repo, im):
    im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
    if im.mode == 'RGBA' and im.getchannel('A').getextrema() == (255, 255):
        im = im.convert('RGB')
    if im.width > 1600:
        im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    name = 'gh-' + thumbs.slug(repo['name'])
    rel = f'{IMG_DIR}/{name}.' + ('png' if im.mode == 'RGBA' else 'jpg')
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for old in os.listdir(os.path.dirname(path)):  # a re-added repo may have had the other format
        if os.path.splitext(old)[0] == name:
            os.remove(os.path.join(os.path.dirname(path), old))
    if im.mode == 'RGBA':
        im.save(path, 'PNG', optimize=True)
    else:
        im.save(path, 'JPEG', quality=85, optimize=True, progressive=True)
    thumbs.write_webps(path, name)
    return rel


def describe(repo, md):
    return {'name': repo['name'], 'created_at': repo['created_at'], 'title': title_of(repo, md),
            'desc': summary_of(repo, md), 'code': repo['html_url'], 'demo': demo_url(repo), 'fp': fingerprint(repo)}


def card_html(c, nl):
    e = html.escape
    data = json.dumps({'title': c['title'], 'img': c['image'], 'desc': c['desc']}, ensure_ascii=False)
    data = data.replace('&', '&amp;').replace("'", '&#39;').replace('<', '&lt;').replace('>', '&gt;')
    lines = [
        f'<!-- auto: {c["name"].replace("--", "-")} -->',
        f'<article class="card" tabindex="0" data-auto-repo="{e(c["name"])}" data-project=\'{data}\'>',
        f'  <picture><source type="image/webp" srcset="batman/img/{thumbs.slug(c["image"])}.webp">'
        f'<img loading="lazy" decoding="async" src="{e(c["image"])}" alt="{e(c["title"])} preview"></picture>',
        f'  <h4 aria-level="3">{e(c["title"], quote=False)}</h4>',
        f'  <p>{e(c["desc"], quote=False)}</p>',
        '  <div class="card-actions">',
        f'    <a class="btn" href="{e(c["code"])}" target="_blank">View Code</a>',
    ]
    if c['demo']:
        lines.append(f'    <a class="btn" href="{e(c["demo"])}" target="_blank">View Demo</a>')
    lines += ['  </div>', '</article>']
    return nl.join(PAD + line for line in lines)


def render_block(cards, nl):
    """The text between the two markers, newest repo first."""
    if not cards:
        return nl + PAD
    cards = sorted(cards, key=lambda c: c['created_at'], reverse=True)
    return nl + nl + (nl + nl).join(card_html(c, nl) for c in cards) + nl + nl + PAD


def ensure_block(page, nl):
    """First run: put the markers right after the three featured cards (the rest of the grid is behind See More)."""
    if BLOCK.search(page):
        return page
    grid = page.find('id="projects-grid"')
    if grid == -1:
        sys.exit('batman.html has no #projects-grid')
    pos = page.index('>', grid) + 1
    for _ in range(3):
        end = page.find('</article>', pos)
        if end == -1:
            break
        pos = end + len('</article>')
    return page[:pos] + nl + nl + PAD + START + nl + PAD + END + page[pos:]


def unused_pictures(page):
    folder = os.path.join(ROOT, IMG_DIR)
    if not os.path.isdir(folder):
        return []
    return [f for f in os.listdir(folder) if f'{IMG_DIR}/{f}' not in page]


# ------------------------------------------------------------------ run
def load_state():
    try:
        with open(STATE, encoding='utf-8') as f:
            state = json.load(f)
    except FileNotFoundError:
        state = {}
    for key in ('added', 'checked', 'aliases'):
        state.setdefault(key, {})
    return state


def save_state(state, before):
    """Write only when something changed, or as the heartbeat that keeps the weekly schedule alive."""
    now = datetime.datetime.now(datetime.timezone.utc)
    last = state.get('last_run')
    stale = not last or now - datetime.datetime.fromisoformat(last) > datetime.timedelta(days=HEARTBEAT_DAYS)
    body = {k: v for k, v in state.items() if k != 'last_run'}
    if body == before and not stale:
        return False
    state['last_run'] = now.isoformat(timespec='seconds')
    with open(STATE, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(state, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write('\n')
    return True


def report(rep, dry):
    head = 'Dry run - nothing written' if dry else 'Weekly project check'
    out = [f'## {head} ({datetime.date.today().isoformat()})', '']
    for key, label in [('added', 'Added'), ('refreshed', 'Card text refreshed'), ('removed', 'Removed'),
                       ('close', f'Close calls - not added (score {CLOSE_AT}-{ADD_AT - 1} of {ADD_AT} needed; '
                                 'add the topic `portfolio` to include one)'),
                       ('skipped', 'Not added'), ('errors', 'Errors - tried again next run')]:
        if rep[key]:
            out.append(f'**{label}**')
            out += [f'- {line}' for line in rep[key]]
            out.append('')
    out.append(f'{rep["on_page"]} repos are already on the page; {rep["unchanged"]} unchanged since the last look.')
    text = '\n'.join(out)
    print(text)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as f:
            f.write(text + '\n')


def main():
    ap = argparse.ArgumentParser(description='Add new GitHub projects to batman.html (see the module docstring).')
    ap.add_argument('--dry-run', action='store_true', help='report what would change and write nothing')
    dry = ap.parse_args().dry_run
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    with open(PAGE, encoding='utf-8', newline='') as f:
        original = f.read()
    nl = '\r\n' if '\r\n' in original else '\n'
    page = ensure_block(original, nl)
    m = BLOCK.search(page)
    outside = page[:m.start(2)] + page[m.end(2):]
    state = load_state()
    before = json.loads(json.dumps({k: v for k, v in state.items() if k != 'last_run'}))
    added, checked = state['added'], state['checked']
    rep = {k: [] for k in ('added', 'refreshed', 'removed', 'close', 'skipped', 'errors')}
    rep.update(on_page=0, unchanged=0)
    new_titles = []

    try:
        repos = list_repos()
        linked = linked_repo_ids(outside, {r['name'].lower(): r for r in repos}, state['aliases'])
    except RateLimited as e:
        sys.exit(str(e))
    page_urls = {norm_url(html.unescape(u)) for u in re.findall(r'href="([^"]+)"', outside)}

    for repo in sorted(repos, key=lambda r: r['created_at']):
        rid, name = str(repo['id']), repo['name']
        topics = {t.lower() for t in repo.get('topics') or []}
        rule = hard_rule(repo, topics, linked, page_urls)
        if rule:
            checked.pop(rid, None)
            if rid in added:
                rep['removed'].append(f'{name} - {rule}')
                del added[rid]
            elif rule.startswith('already on the page'):
                rep['on_page'] += 1
            continue
        fp = fingerprint(repo)
        if (added.get(rid) or checked.get(rid) or {}).get('fp') == fp:
            rep['unchanged'] += 1
            continue
        try:
            if rid in added:  # changed since it was added: refresh the text, keep the picture
                md, _ = readme(repo)
                old = {k: added[rid].get(k) for k in ('title', 'desc', 'demo')}
                added[rid].update(describe(repo, md))
                if any(added[rid][k] != v for k, v in old.items()):
                    rep['refreshed'].append(name)
                continue
            rule = fork_rule(repo, page_urls) if repo.get('fork') else None
            md, base = ('', '') if rule else readme(repo)
            if rule:
                score, why = None, [rule]
            elif 'portfolio' in topics:
                score, why = None, ['topic portfolio']
            else:
                score, why = judge(repo, md, base)
            if not rule and (score is None or score >= ADD_AT):
                card = describe(repo, md)
                src, im = pick_picture(repo, md, base, card['title'])
                card['image'] = f'{IMG_DIR}/gh-{thumbs.slug(name)}.(not saved)' if dry else save_picture(repo, im)
                card.update(added_on=datetime.date.today().isoformat(), score=score, why=why)
                added[rid] = card
                checked.pop(rid, None)
                new_titles.append(card['title'])
                rep['added'].append(f'**{card["title"]}** ({name}, score {score if score is not None else "forced"}: '
                                    f'{"; ".join(why)}) - "{card["desc"]}" - picture: {src}')
            else:
                verdict = 'close' if score is not None and score >= CLOSE_AT else 'skipped'
                checked[rid] = {'name': name, 'fp': fp, 'score': score, 'why': why, 'verdict': verdict}
                rep[verdict].append(f'{name}' + (f' (score {score})' if score is not None else '') +
                                    ': ' + '; '.join(why))
        except RateLimited as e:
            sys.exit(str(e))
        except Exception as e:  # one broken repo must not stop the others
            rep['errors'].append(f'{name}: {e}')

    live = {str(r['id']) for r in repos}
    for rid in [r for r in added if r not in live]:
        rep['removed'].append(f'{added[rid]["name"]} - deleted or made private')
        del added[rid]
    for rid in [r for r in checked if r not in live]:
        del checked[rid]

    page = page[:m.start(2)] + render_block(list(added.values()), nl) + page[m.end(2):]
    report(rep, dry)
    if dry:
        return
    if page != original:
        with open(PAGE, 'w', encoding='utf-8', newline='') as f:
            f.write(page)
        thumbs.write_snapshot(page)
    for f in unused_pictures(page):
        os.remove(os.path.join(ROOT, IMG_DIR, f))
        for folder, _, _ in thumbs.OUTPUTS:
            webp = os.path.join(folder, thumbs.slug(f) + '.webp')
            if os.path.exists(webp):
                os.remove(webp)
    save_state(state, before)
    if os.environ.get('GITHUB_OUTPUT'):
        msg = (f'Add {len(new_titles)} project card(s) from GitHub: ' + ', '.join(new_titles) if new_titles
               else f'Remove {len(rep["removed"])} project card(s)' if rep['removed']
               else 'Weekly project check')
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as f:
            f.write(f'message={msg}\n')


if __name__ == '__main__':
    main()
