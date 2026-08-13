"""Output budgets derived from requested result size."""
def estimate_question_gen_tokens(num_questions: int) -> int:
    return min(8192, 300 + max(1, num_questions) * 70)
def estimate_mcq_gen_tokens(num_questions: int) -> int:
    return min(8192, 400 + max(1, num_questions) * 140)
def estimate_rubrics_tokens(max_marks: int) -> int:
    return min(2048, 300 + max(1, max_marks // 2) * 40)
def estimate_evaluation_tokens() -> int:
    return 700
