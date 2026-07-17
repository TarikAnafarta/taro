import httpx
import re
from typing import List, Dict

async def perform_web_search(query: str, max_results: int = 3) -> List[Dict[str, str]]:
    """Performs a lightweight web search using DuckDuckGo HTML version."""
    url = "https://html.duckduckgo.com/html/"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    data = {"q": query}
    
    results = []
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(url, data=data, headers=headers)
            html = res.text
            
            # Extract snippets using regex
            snippets = re.findall(r'<a class="result__snippet[^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
            
            for s in snippets:
                # Remove html tags
                clean_text = re.sub(r'<[^>]+>', '', s).strip()
                # Unescape common HTML entities
                clean_text = clean_text.replace('&#x27;', "'").replace('&quot;', '"').replace('&amp;', '&').replace('<b>', '').replace('</b>', '')
                
                if clean_text:
                    results.append({"summary": clean_text})
                    if len(results) >= max_results:
                        break
    except Exception as e:
        print(f"Web search error for query '{query}': {e}")
        
    return results
