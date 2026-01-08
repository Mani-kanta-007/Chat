from tavily import TavilyClient
from config import settings
from typing import List, Dict


class WebSearchService:
    """Service for web search using Tavily API."""
    
    def __init__(self):
        self.client = None
        if settings.tavily_api_key:
            self.client = TavilyClient(api_key=settings.tavily_api_key)
    
    async def search(self, query: str, max_results: int = 5) -> List[Dict]:
        """Perform web search and return results."""
        if not self.client:
            return [{
                "error": "Tavily API key not configured. Please set TAVILY_API_KEY in .env file."
            }]
        
        try:
            response = self.client.search(
                query=query,
                max_results=max_results,
                search_depth="basic",
                include_answer=True,
                include_raw_content=False
            )
            
            results = []
            
            # Add the AI-generated answer if available
            if response.get('answer'):
                results.append({
                    "type": "answer",
                    "content": response['answer']
                })
            
            # Add search results
            for result in response.get('results', []):
                results.append({
                    "type": "result",
                    "title": result.get('title', ''),
                    "url": result.get('url', ''),
                    "content": result.get('content', ''),
                    "score": result.get('score', 0)
                })
            
            return results
        except Exception as e:
            return [{
                "error": f"Web search failed: {str(e)}"
            }]
    
    def format_search_context(self, search_results: List[Dict]) -> str:
        """Format search results into a context string for the LLM."""
        if not search_results:
            return ""
        
        # Check for errors
        if search_results[0].get('error'):
            return f"Web search error: {search_results[0]['error']}"
        
        context = "### Web Search Results:\n\n"
        
        for result in search_results:
            if result.get('type') == 'answer':
                context += f"**Quick Answer:** {result['content']}\n\n"
            elif result.get('type') == 'result':
                context += f"**{result['title']}**\n"
                context += f"Source: {result['url']}\n"
                context += f"{result['content']}\n\n"
        
        context += "---\n\n"
        return context


# Singleton instance
web_search_service = WebSearchService()
