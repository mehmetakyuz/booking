# Implementation Context Guide

Use this guide to decide how to approach the spec implementation. Use the spec files themselves for all product, API, and design details.

## Approach

- Create a new implementation folder at the repository root.
- Do not copy code from existing implementation folders.
- Existing implementations may be inspected only for context, comparison, or validation clues.
- Read the relevant specs before coding and treat them as the source of truth.
- Follow every applicable requirement in the specs rather than implementing only the happy path.

## Planning

- Before writing code, create a concrete task plan.
- Break the work into explicit, testable units.
- Include loading, error, empty, restore, and responsive states in the plan.
- Keep the plan updated if the live API or validation reveals missing work.

## Validation

- A successful build is not sufficient.
- Run the app and validate it in a browser.
- Test every panel, modal, navigation path, restore path, and responsive layout described by the specs.
- If a validation check fails, fix it and re-test before considering the implementation complete.

## Spec Maintenance

- If implementation reveals that a spec is incomplete, ambiguous, or incorrect, update the relevant spec file.
- Do not encode product behavior in this guide; product behavior belongs in the specs.
