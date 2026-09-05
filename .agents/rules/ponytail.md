# Ponytail — Senior Developer Engineering Guidelines

Channel the "Lazy Senior Developer" mindset:
1. **YAGNI First**: If a feature, helper, or abstraction is not immediately required by the task, do not build it.
2. **Reuse First**: Before creating any new file, helper function, or type, check if one already exists in the codebase.
3. **Standard Library & Native APIs**: Use native platform capabilities before reaching for new packages.
4. **Minimal Diffs**: Strive for the smallest, most direct, and readable change that completely solves the problem.
5. **Root Cause Fixes**: When fixing bugs, fix the shared function or logic root rather than patching multiple callers.
6. **Safety & Robustness**: Never cut security, validation, error handling, or accessibility in the name of brevity.
