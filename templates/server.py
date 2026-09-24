import http.server
import socketserver
import os
import urllib.request
import urllib.parse
import gzip
import json

PORT = 8089
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WAYBACK_BASE = "https://web.archive.org/web/20260426114426id_/https://copilot.microsoft.com"

opener = urllib.request.build_opener(urllib.request.HTTPRedirectHandler)
opener.addheaders = [
    ('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'),
    ('Accept-Encoding', 'gzip, deflate')
]

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.mp3': 'audio/mpeg',
    '.webm': 'video/webm'
}

CONFIG_MOCK = {
    "signInPrompts": [],
    "voices": [],
    "voiceLanguages": [],
    "maxTextMessageLength": 4000,
    "feedbackOptions": {
        "text": [
            {"type": "helpful", "label": "Helpful"},
            {"type": "accurate", "label": "Accurate"}
        ],
        "image": [
            {"type": "creative", "label": "Creative"}
        ],
        "call": [],
        "appearance": [],
        "card": {
            "local": [], "ads": [], "video": [], "image": [], "sports": [], "job": []
        }
    },
    "pageLimit": 50,
    "maxPageContentLength": 50000,
    "maxPageTitleLength": 100,
    "attachments": {
        "maxFilesPerMessage": 5,
        "maxFileNameLength": 255,
        "image": {
            "mimeTypes": ["image/png", "image/jpeg", "image/webp"],
            "maxBytes": 10485760
        },
        "document": {
            "mimeTypes": ["application/pdf", "text/plain"],
            "maxBytes": 20971520
        }
    }
}

GALLERY_MOCK = [
    {
        "id": "gallery-1",
        "type": "image",
        "url": "/static/cmc/images/gallery-1.jpg",
        "thumbnailUrl": "/static/cmc/images/gallery-1-thumb.jpg",
        "width": 600,
        "height": 750,
        "likedCount": 342,
        "isLiked": False,
        "prompt": "Ultra-detailed futuristic cyberpunk city with neon holograms and sunset reflections in rain puddles",
        "tags": ["cyberpunk", "city", "sunset"]
    },
    {
        "id": "gallery-2",
        "type": "image",
        "url": "/static/cmc/images/gallery-2.jpg",
        "thumbnailUrl": "/static/cmc/images/gallery-2-thumb.jpg",
        "width": 600,
        "height": 600,
        "likedCount": 512,
        "isLiked": True,
        "prompt": "Magical ancient forest glowing with bioluminescent blue mushrooms and floating fairy lights, 8k octane render",
        "tags": ["nature", "fantasy", "magical"]
    },
    {
        "id": "gallery-3",
        "type": "image",
        "url": "/static/cmc/images/gallery-3.jpg",
        "thumbnailUrl": "/static/cmc/images/gallery-3-thumb.jpg",
        "width": 600,
        "height": 800,
        "likedCount": 820,
        "isLiked": False,
        "prompt": "Stunning cosmic vista with a ringed purple exoplanet rising above a swirling golden stardust nebula",
        "tags": ["space", "astronomy", "cosmos"]
    },
    {
        "id": "gallery-4",
        "type": "image",
        "url": "/static/cmc/images/gallery-4.jpg",
        "thumbnailUrl": "/static/cmc/images/gallery-4-thumb.jpg",
        "width": 600,
        "height": 720,
        "likedCount": 195,
        "isLiked": False,
        "prompt": "Sunlit architectural interior with terracotta arches, olive trees in ceramic pots, soft cinematic morning shadows",
        "tags": ["architecture", "minimalism", "interior"]
    },
    {
        "id": "gallery-5",
        "type": "image",
        "url": "/static/cmc/images/gallery-5.jpg",
        "thumbnailUrl": "/static/cmc/images/gallery-5-thumb.jpg",
        "width": 600,
        "height": 600,
        "likedCount": 640,
        "isLiked": False,
        "prompt": "Isometric 3D diorama of a cozy miniature loft bedroom with ultrawide monitors, cat sleeping, warm ambient lamp",
        "tags": ["3d", "isometric", "cozy"]
    },
    {
        "id": "gallery-6",
        "type": "image",
        "url": "/static/cmc/images/gallery-6.jpg",
        "thumbnailUrl": "/static/cmc/images/gallery-6-thumb.jpg",
        "width": 600,
        "height": 750,
        "likedCount": 418,
        "isLiked": True,
        "prompt": "Delicate watercolor painting of blooming cherry blossoms blending into mist with gold foil texture splatters",
        "tags": ["watercolor", "flowers", "art"]
    },
    {
        "id": "gallery-7",
        "type": "image",
        "url": "/static/cmc/images/gallery-7.jpg",
        "thumbnailUrl": "/static/cmc/images/gallery-7-thumb.jpg",
        "width": 600,
        "height": 650,
        "likedCount": 275,
        "isLiked": False,
        "prompt": "Low poly geometric stained-glass hummingbird hovering mid-air, refracting vibrant spectral light beams",
        "tags": ["geometric", "wildlife", "prismatic"]
    },
    {
        "id": "gallery-8",
        "type": "image",
        "url": "/static/cmc/images/gallery-8.jpg",
        "thumbnailUrl": "/static/cmc/images/gallery-8-thumb.jpg",
        "width": 600,
        "height": 750,
        "likedCount": 930,
        "isLiked": True,
        "prompt": "Retro 80s outrun vaporwave landscape with a retro sports car driving towards a giant digital wireframe sun",
        "tags": ["retro", "synthwave", "80s"]
    }
]

DISCOVERY_MOCK = {
    "id": "discovery-feed-1",
    "traceId": None,
    "sections": [
        {
            "title": "Trending in AI & Science",
            "cards": [
                {
                    "id": "disc-1",
                    "type": "chat",
                    "title": "Breakthroughs in Deep Reasoning & Agentic Workflows",
                    "prompt": "Explain how modern reasoning models and autonomous agents coordinate complex engineering workflows.",
                    "thumbnail": {
                        "url": "/static/cmc/images/gallery-1-thumb.jpg",
                        "backgroundColor": "#1a0e28",
                        "altText": "AI Reasoning"
                    }
                },
                {
                    "id": "disc-2",
                    "type": "chat",
                    "title": "Bioluminescence: How Organisms Produce Natural Light",
                    "prompt": "Describe the chemical mechanisms behind luciferin-luciferase reactions in deep sea creatures.",
                    "thumbnail": {
                        "url": "/static/cmc/images/gallery-2-thumb.jpg",
                        "backgroundColor": "#05191e",
                        "altText": "Bioluminescence"
                    }
                }
            ]
        },
        {
            "title": "Creative Explorations",
            "cards": [
                {
                    "id": "disc-3",
                    "type": "chat",
                    "title": "Architectural Harmony in Biophilic Design",
                    "prompt": "What are the core design principles of integrating natural light and organic materials into living spaces?",
                    "thumbnail": {
                        "url": "/static/cmc/images/gallery-4-thumb.jpg",
                        "backgroundColor": "#f0e6d7",
                        "altText": "Architecture"
                    }
                },
                {
                    "id": "disc-4",
                    "type": "chat",
                    "title": "Retro Futurism: The Cultural Legacy of Synthwave",
                    "prompt": "Explore the aesthetic roots and musical instruments that shaped the 1980s neon synthwave movement.",
                    "thumbnail": {
                        "url": "/static/cmc/images/gallery-8-thumb.jpg",
                        "backgroundColor": "#0f051e",
                        "altText": "Synthwave"
                    }
                }
            ]
        }
    ]
}

class CopilotHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH, HEAD')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-search-uilang')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith('/c/api/'):
            api_endpoint = path[len('/c/api/'):]
            self.handle_api(api_endpoint, method='POST')
            return

        self.send_response(404)
        self.end_headers()

    def do_PATCH(self):
        self.send_response(200)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"status": "ok"}')

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        cookie_header = [('Set-Cookie', 'userSidebarOpen_cmc=open; Path=/; Max-Age=315360000; SameSite=Lax')]

        # Page routing
        if path in ('/', '', '/index.html'):
            self.serve_file(os.path.join(BASE_DIR, 'index.html'), extra_headers=cookie_header)
            return

        if path in ('/labs', '/labs.html'):
            self.serve_file(os.path.join(BASE_DIR, 'labs.html'), extra_headers=cookie_header)
            return

        if path in ('/imagine', '/imagine.html', '/inspire', '/inspire.html'):
            self.serve_file(os.path.join(BASE_DIR, 'imagine.html'), extra_headers=cookie_header)
            return

        if path in ('/discover', '/discover.html', '/discovery'):
            self.serve_file(os.path.join(BASE_DIR, 'discover.html'), extra_headers=cookie_header)
            return

        if path in ('/shopping', '/shopping.html'):
            self.serve_file(os.path.join(BASE_DIR, 'shopping.html'), extra_headers=cookie_header)
            return

        if path in ('/chat', '/chat.html'):
            self.serve_file(os.path.join(BASE_DIR, 'chat.html'), extra_headers=cookie_header)
            return

        # Clarity & Telemetry mock
        if (path.startswith('/cl/') or path.startswith('/clarity')) and not path.startswith('/static/'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript')
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(b'window.clarity = window.clarity || function(){};')
            return

        # API routing
        if path.startswith('/c/api/'):
            api_endpoint = path[len('/c/api/'):]
            self.handle_api(api_endpoint, method='GET')
            return

        # Direct file resolution
        rel_path = path.lstrip('/')
        local_path = os.path.join(BASE_DIR, rel_path)

        if os.path.exists(local_path) and os.path.isfile(local_path):
            self.serve_file(local_path)
            return

        # Fetch missing static asset from Wayback Machine
        if path.startswith('/static/cmc/'):
            downloaded = self.fetch_from_wayback(path, local_path)
            if downloaded and os.path.exists(local_path):
                self.serve_file(local_path)
                return

        # Fallback to index.html for chats or unknown sub-routes
        if path in ('/chats', '/library'):
            self.serve_file(os.path.join(BASE_DIR, 'index.html'))
            return

        self.send_response(404)
        self.end_headers()

    def handle_api(self, endpoint, method='GET'):
        ep = endpoint.split('?')[0].strip('/')

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()

        if ep == 'user':
            resp = {
                "id": "guest-user",
                "preferredName": "Guest",
                "firstName": "Guest",
                "anid": None,
                "isPro": False,
                "isDeprecated": False,
                "inEeaPlusRegion": False,
                "inGdprRegion": False,
                "regionCode": "US",
                "isHistoryMigrationPending": False,
                "isInsider": False,
                "isEligibleForFreeTrial": False,
                "phoneLink": None,
                "ageGroup": None,
                "allowedToggles": {
                    "textTraining": False,
                    "voiceTraining": False,
                    "personalization": False
                },
                "remainingUsage": {
                    "reasoningCalls": 100,
                    "podcastGenerations": 10,
                    "researchCalls": 50,
                    "taskCreations": 20,
                    "visionCallSeconds": 300,
                    "videoGenerations": 5
                },
                "requiredConsents": {
                    "portrait": None,
                    "compliance": None,
                    "vision": None,
                    "healthSpace": None,
                    "tasksDisclaimer": None
                },
                "privacyRequirement": None
            }
        elif ep == 'user/settings':
            resp = {
                "preferredVoice": None,
                "preferredVoiceLanguage": "en-US",
                "personality": None,
                "toggles": {
                    "training": False,
                    "personalization": False,
                    "phone-connection": False,
                    "voice-training": False
                }
            }
        elif ep == 'config':
            resp = CONFIG_MOCK
        elif ep == 'start':
            resp = {
                "currentConversationId": None,
                "isNewUser": False,
                "banExpiresAt": None,
                "remainingTurns": 100,
                "features": [],
                "allowBeta": False,
                "userId": "guest-user",
                "inDataUseWaitingPeriod": False,
                "isBlocked": False
            }
        elif ep == 'conversations':
            if method == 'POST':
                resp = {
                    "id": "conv-local-1",
                    "scope": "default"
                }
            else:
                resp = {
                    "results": [],
                    "next": None
                }
        elif 'history' in ep:
            resp = {
                "results": [],
                "next": None
            }
        elif 'library' in ep:
            resp = {
                "results": [],
                "next": None
            }
        elif ep == 'discovery':
            resp = DISCOVERY_MOCK
        elif ep.startswith('gallery/featured'):
            resp = {
                "results": GALLERY_MOCK[:4]
            }
        elif ep.startswith('gallery'):
            resp = {
                "results": GALLERY_MOCK,
                "next": None
            }
        elif ep == 'user/install-status':
            resp = {
                "isMobileAppInstalled": False
            }
        elif ep.startswith('activation/homepage'):
            resp = {
                "pages": []
            }
        else:
            resp = {
                "results": [],
                "status": "ok"
            }

        try:
            self.wfile.write(json.dumps(resp).encode('utf-8'))
        except Exception:
            pass

    def serve_file(self, filepath, extra_headers=None):
        ext = os.path.splitext(filepath)[1].lower()
        content_type = MIME_TYPES.get(ext, 'application/octet-stream')

        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_cors_headers()
            if extra_headers:
                for k, v in extra_headers:
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(content)
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as e:
            try:
                self.send_response(500)
                self.end_headers()
            except Exception:
                pass

    def fetch_from_wayback(self, rel_path, local_dest):
        url = WAYBACK_BASE + rel_path
        print(f"[CACHE MISS] Fetching from Wayback: {rel_path}")
        try:
            req = urllib.request.Request(url)
            with opener.open(req, timeout=15) as resp:
                data = resp.read()
                if resp.headers.get('Content-Encoding') == 'gzip' or data.startswith(b'\x1f\x8b'):
                    try:
                        data = gzip.decompress(data)
                    except Exception:
                        pass
                os.makedirs(os.path.dirname(local_dest), exist_ok=True)
                with open(local_dest, 'wb') as f:
                    f.write(data)
                print(f"[CACHE SAVED] {rel_path} ({len(data)} bytes)")
                return True
        except Exception as e:
            print(f"[CACHE FAIL] {rel_path}: {e}")
            return False

class ThreadingServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

def run():
    with ThreadingServer(("", PORT), CopilotHandler) as httpd:
        print(f"Copilot local server running at http://localhost:{PORT}")
        httpd.serve_forever()

if __name__ == '__main__':
    run()
