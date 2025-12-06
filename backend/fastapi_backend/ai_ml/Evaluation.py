# Necessary inputs

# Langchain modules for building LLM applications
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_huggingface import HuggingFacePipeline

# Transformers for loading pre-trained models
from transformers import pipeline

# Pydantic for data validation and settings management
from pydantic import BaseModel, Field
from typing import List, Annotated


class EvalSchema(BaseModel):

    score: Annotated[int, Field(title="Score of student")]
    strengths: Annotated[List[str], Field(
        title="Strengths in students answer")]
    weakness: Annotated[List[str], Field(title="Weaknes in students answer")]
    justification: Annotated[str, Field(title="Overall summary of evaluation")]
    suggested_improvement: Annotated[str, Field(
        title="Improvements in students answer after evaluation")]


class HFModelCreation:
    """
    A utility class to create and configure HuggingFace pipeline models for text generation.
    """

    def __init__(self):
        """
        Initializes the HFModelCreation class.
        """
        pass

    def hf_model_creator(self, model_name: str):
        """
        Creates a HuggingFace text generation pipeline and wraps it with HuggingFacePipeline.

        Args:
          model_name (str): The name of the HuggingFace model to load (e.g., "Qwen/Qwen3-4B-Instruct-2507").

        Returns:
          HuggingFacePipeline: An initialized HuggingFacePipeline object if successful, None otherwise.
        """
        try:
            # Initialize a text generation pipeline with specified model and parameters
            model_pipeline = pipeline(
                task="text-generation",
                model=model_name,
                temperature=0.1,  # Controls the randomness of the output
                max_new_tokens=1024,  # Maximum number of tokens to generate
                return_full_text=False,  # Only return generated text, not prompt
                repetition_penalty=1.1  # Penalize repeating tokens
            )

            # Wrap the pipeline in LangChain's HuggingFacePipeline for compatibility
            model = HuggingFacePipeline(pipeline=model_pipeline)

            return model

        except Exception as e:
            print(f"Some error occured! Details: {e}")
            return None


class EvaluationEngine(HFModelCreation):
    """
    Class for evaluating students' answers by providing attributes like question, answer,
    rubric and maximum marks for the question. It leverages a HuggingFace model for evaluation.

    How To Run?

    First initiate an evaluator object by passing the model name to be used in the constructor.
    Example: answer_evaluator = EvaluationEngine(model_name="Qwen/Qwen3-4B-Instruct-2507")

    Then create an input dictionary having keys 'question', 'answer', and 'max_marks'.
    Example:
      input_features = {
      "question_text": "Differentiate between supervised and unsupervised machine learning.",
      "answer": "Supervised ML is used when we supervise the model and unsupervised ML is used when it runs on its own",
      "max_marks": 10
    }

    Then access the function `model_evaluator` to evaluate the student's answer by passing the input dictionary.
    Example: evaluation = answer_evaluator.model_evaluator(input_features)

    The evaluation response will contain the score, strengths, weakness, justification, and suggested improvement.
    Example:
      {'score': 2, 'strengths': ['Attempts to differentiate between supervised and unsupervised learning'], 'weakness': ['Lacks clear explanation of supervised learning with examples like classification or regression', 'Does not explain unsupervised learning with examples like clustering or dimensionality reduction', 'Fails to provide accurate comparison in terms of data requirements, purpose, and typical use cases', "Response is overly simplistic and vague, e.g.,'supervise the model' and 'runs on its own'"], 'justification': 'The answer provides a basic distinction but lacks depth, specificity, and technical accuracy required under the rubric. It does not meet the criteria for full marks due to absence of concrete examples and meaningful comparisons.', 'suggested_improvement': 'Explain supervised learning using real-world examples such as predicting house prices (regression) or classifying emails as spam (classification). For unsupervised learning, describe how clustering groups similar customers or dimensionality reduction simplifies high-dimensional data. Then compare both in terms of labeled vs unlabeled data, objectives, and practical applications.'}
    """

    def __init__(self, model_name: str):
        """
        Initializes the EvaluationEngine with a specified HuggingFace model.

        Args:
          model_name (str): The name of the HuggingFace model to be used for evaluation.
        """
        # Call the parent class's method to create the model
        self.model_name = model_name

        self.model = None


        # Store the model instance for later use in evaluation

    def get_model(self):
        # Lazy load model only when not available


        if self.model is None:
            self.model = super().hf_model_creator(self.model_name)
        
        return self.model

    def create_rubrics(self, input_features: dict) -> str:
        """
        Generates a simple marking rubric for a given question and maximum marks.

        Args:
          input_features (dict): A dictionary containing 'question_text' (str) and 'max_marks' (int).

        Returns:
          str: The generated rubric as a plain text string.

        Raises:
          KeyError: If 'question_text' or 'max_marks' are missing from input_features.
        """
        try:
            if "question_text" not in input_features:
                raise KeyError(
                    "Input features must have an attribute of question_text")
            elif "max_marks" not in input_features:
                raise KeyError(
                    "Input features must have an attribute of maximum marks")

            # Define the prompt template for rubric generation
            template = """
You are an exam evaluation assistant.

Generate a **simple marking rubric** for the question below.
Output must be **plain text only** - no JSON, no markdown, no examples, no additional commentary.

FORMAT (strict):
Criteria 1 - X marks: short description
Criteria 2 - Y marks: short description
...
Total Marks: {max_marks}

Now generate the rubric.

Question: {question_text}
Maximum Marks: {max_marks}
"""

            # Create a PromptTemplate object
            prompt = PromptTemplate(
                template=template,
                input_variables=["question_text", "max_marks"],
            )

            # Create a LangChain expression language (LCEL) chain
            # Prompt -> Model -> String Output Parser
            chain = prompt | self.get_model() | StrOutputParser()

            # Invoke the chain to generate the rubric
            rubric = chain.invoke({
                "question_text": input_features["question_text"],
                "max_marks": input_features["max_marks"],
            })

            return rubric

        except Exception as e:
            print(f"Some error occured! Details: {e}")
            return ""

    def create_evaluation_chain(self):
        """
        Creates a LangChain evaluation chain for processing student answers.
        The chain consists of a prompt, the language model, and a JSON output parser.

        Returns:
          tuple: A tuple containing the LangChain runnable chain and the JsonOutputParser instance.
        """
        try:
            # Initialize JsonOutputParser with the Pydantic schema for evaluation
            parser = JsonOutputParser(pydantic_object=EvalSchema)

            # Define the prompt template for the evaluation process
            template = """
      <|im_start|>system
You are a strict exam evaluation engine. You must respond with valid JSON only.
Do not add any conversational text, Markdown formatting, or code blocks.
<|im_end|>
<|im_start|>user
Refrence Material:
Rubric: {rubric}
Question: {question_text}
Maximum Marks: {max_marks}

Student Answer:
{student_answer}

Evaluate the student answer.
{format_instructions}
<|im_end|>
<|im_start|>assistant
      """

            # Create a PromptTemplate with input variables and partial variables for format instructions
            prompt = PromptTemplate(
                template=template,
                input_variables=["question_text", "rubric", "student_answer", "max_marks"],
                partial_variables={
                    "format_instructions": parser.get_format_instructions()},
            )

            # Construct the LangChain expression language (LCEL) chain
            # Prompt -> Model -> JSON Output Parser
            chain = prompt | self.get_model() | parser

            return chain, parser

        except Exception as e:
            print(f"Some error occured! Details: {e}")
            return None, None

    def model_evaluator(self, input_features: dict):
        """
        Evaluates a student's answer based on a question, answer, and maximum marks.
        It first generates a rubric and then uses an LLM to evaluate the answer against it.

        Args:
          input_features (dict): A dictionary containing 'question' (str), 'answer' (str),
                                 and 'max_marks' (int).

        Returns:
          dict: A dictionary containing the evaluation results (score, strengths, weaknesses, etc.).
        """
        try:
            # Create the evaluation chain and parser
            self.chain, self.parser = self.create_evaluation_chain()

            # Generate the rubric for the given question and add it to input_features
            input_features.update(
                {"rubric": self.create_rubrics(input_features)})

            # Invoke the evaluation chain with all input features
            self.response = self.chain.invoke(input_features) # type: ignore

            return self.response

        except Exception as e:
            print(f"Some error occured! Details: {e}")
            return {}
