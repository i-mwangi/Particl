import os

import httpx
from dotenv import load_dotenv
from supabase import create_client, Client
from supabase.lib.client_options import SyncClientOptions

load_dotenv()

_supabase_client: Client | None = None


def get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        # HTTP/1.1 on purpose: Supabase's edge closes idle HTTP/2 connections
        # with GOAWAY, and httpx's h2 pool can reuse the dying connection,
        # raising RemoteProtocolError(ConnectionTerminated) - which surfaced
        # as random 500s on /auth/me and failed generations. httpx detects
        # and discards dead HTTP/1.1 connections before reuse, so h1 is
        # immune to that race.
        _supabase_client = create_client(
            url,
            key,
            options=SyncClientOptions(
                httpx_client=httpx.Client(http2=False, timeout=30)
            ),
        )
    return _supabase_client
