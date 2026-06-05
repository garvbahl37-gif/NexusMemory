from langchain_ollama import OllamaLLM
from langchain.prompts import PromptTemplate
from services.llm import get_llm
import json
import logging
import re

logger = logging.getLogger(__name__)

MEMORY_EXTRACTION_PROMPT = PromptTemplate(
    input_variables=["conversation"],
    template="""You are a memory extraction system. Analyze the conversation and extract important personal facts about the user.

Extract ONLY facts that are:
- Personal preferences (favorite things, likes, dislikes)
- Professional information (job, skills, frameworks they use)
- Goals or intentions
- Personal details the user explicitly shares
- Opinions on specific topics

Conversation:
{conversation}

Return a JSON array of extracted facts. Each fact should be a clear, concise statement.
If no important facts are found, return an empty array.

Format: ["fact1", "fact2", ...]

Only return the JSON array, nothing else.""",
)


def extract_memories_from_conversation(
    messages: list[dict],
    llm: OllamaLLM = None,
) -> list[dict]:
    """
    Extract important facts from recent conversation using LLM.

    Returns list of dicts with 'fact' and 'category' keys.
    """
    if not messages:
        return []

    # Build conversation text from recent messages
    recent = messages[-6:]  # Last 3 exchanges
    conversation_text = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in recent
    )

    llm = llm or get_llm()

    try:
        chain = MEMORY_EXTRACTION_PROMPT | llm
        result = chain.invoke({"conversation": conversation_text})

        # Parse JSON response
        result_str = str(result).strip()

        # Find JSON array in response
        json_match = re.search(r'\[.*?\]', result_str, re.DOTALL)
        if not json_match:
            return []

        facts_raw = json.loads(json_match.group())

        if not isinstance(facts_raw, list):
            return []

        # Categorize each fact
        categorized = []
        for fact in facts_raw:
            if isinstance(fact, str) and len(fact) > 5:
                category = categorize_fact(fact)
                categorized.append({
                    "fact": fact.strip(),
                    "category": category,
                })

        logger.info(f"Extracted {len(categorized)} memory facts")
        return categorized

    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse failed for memory extraction: {e}")
        return []
    except Exception as e:
        logger.error(f"Memory extraction failed: {e}")
        return []


def categorize_fact(fact: str) -> str:
    """Simple rule-based fact categorization."""
    fact_lower = fact.lower()

    tech_keywords = [
        "framework", "language", "library", "tool", "stack",
        "python", "javascript", "react", "fastapi", "code",
        "developer", "engineer", "programming",
    ]
    preference_keywords = [
        "favorite", "prefer", "like", "love", "enjoy",
        "hate", "dislike", "best", "worst",
    ]
    professional_keywords = [
        "work", "job", "company", "team", "project",
        "experience", "skill", "years",
    ]
    goal_keywords = [
        "want", "goal", "plan", "trying", "learning",
        "building", "working on",
    ]

    if any(k in fact_lower for k in tech_keywords):
        return "technical"
    elif any(k in fact_lower for k in goal_keywords):
        return "goal"
    elif any(k in fact_lower for k in professional_keywords):
        return "professional"
    elif any(k in fact_lower for k in preference_keywords):
        return "preference"
    else:
        return "general"