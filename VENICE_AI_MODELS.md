# Venice AI Models

The following models are available through the Venice AI API:

| Model | Type | Special Traits | Key Capabilities |
|-------|------|----------------|-----------------|
| llama-3.2-3b | text | fastest | - FP16 quantization<br>- Function calling<br>- Response schema support<br>- Web search support |
| llama-3.3-70b | text | function_calling_default, default | - FP8 quantization<br>- Function calling<br>- Web search support |
| llama-3.1-405b | text | most_intelligent | - FP8 quantization<br>- Web search support |
| mistral-31-24b | text | default_vision | - FP16 quantization<br>- **Vision support**<br>- Function calling<br>- Response schema support<br>- Web search support |
| qwen-2.5-qwq-32b | text | | - FP8 quantization<br>- **Optimized for code**<br>- Response schema support<br>- Web search support<br>- **Reasoning support** |
| qwen-2.5-vl | text | | - FP8 quantization<br>- **Vision support**<br>- Response schema support<br>- Web search support |
| dolphin-2.9.2-qwen2-72b | text | most_uncensored | - FP8 quantization<br>- Response schema support<br>- Web search support |
| deepseek-r1-671b | text | default_reasoning | - FP8 quantization<br>- **Optimized for code**<br>- Web search support<br>- **Reasoning support** |
| qwen-2.5-coder-32b | text | default_code | - FP8 quantization<br>- **Optimized for code** |
| deepseek-coder-v2-lite | text | | - FP16 quantization<br>- **Optimized for code**<br>- Response schema support |

## Notes

- Our application is set to use `llama-3.3-70b` as the default model, which provides a good balance of capabilities while being the designated default model with function calling support.
- We could consider using specialized models for specific tasks:
  - `mistral-31-24b` for vision-related tasks
  - `deepseek-r1-671b` for reasoning tasks
  - `qwen-2.5-coder-32b` for code generation and analysis

## Context Sizes

Different models support different context lengths:

- `llama-3.2-3b`: 131,072 tokens
- `llama-3.3-70b`: 65,536 tokens
- `llama-3.1-405b`: 65,536 tokens
- `mistral-31-24b`: 131,072 tokens
- `qwen-2.5-qwq-32b`: 32,768 tokens
- `qwen-2.5-vl`: 32,768 tokens
- `deepseek-r1-671b`: 131,072 tokens