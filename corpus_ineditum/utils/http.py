import httpx
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

def get_client() -> httpx.Client:
    """Returns a standard HTTP client."""
    return httpx.Client(
        timeout=httpx.Timeout(30.0),
        follow_redirects=True,
        headers={"User-Agent": "CorpusIneditum/0.1 (Research Tool; https://github.com/lorenhey/corpus-ineditum)"}
    )

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError))
)
def fetch_url(url: str, params: dict = None) -> httpx.Response:
    """Fetches a URL with retries."""
    with get_client() as client:
        response = client.get(url, params=params)
        response.raise_for_status()
        return response
