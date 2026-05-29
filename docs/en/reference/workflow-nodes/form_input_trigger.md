---
title: Form Input Trigger
description: Starts a workflow when a form is submitted.
---

# Form Input Trigger

## Overview

The Form Input Trigger node starts a workflow execution when a user submits a form. It defines the form's schema — fields, types, and validation rules — and makes the submitted values available as structured output to downstream nodes. Use it as the entry point for any workflow that requires user-provided data before processing begins. No credentials are required; the form schema is defined entirely in the node config.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `formId` | string | Yes | Unique identifier for this form. Used to route submissions to the correct workflow trigger. |
| `title` | string | No | Display title shown to the user above the form. |
| `fields` | object[] | Yes | Array of field definitions. Each entry includes name (string), label (string), type (enum: text | number | boolean | select | textarea | date), required (boolean), and optionally options (string[]) for select fields. |
| `submitLabel` | string | No | Label for the form submit button. Defaults to 'Submit'. |
| `allowMultipleSubmissions` | boolean | No | When true, the form can be submitted more than once, triggering a new workflow run each time. Defaults to false. |

## Inputs

| Port | Type | Description |
|---|---|---|


## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | The submitted form data as a key-value map where each key corresponds to a field name defined in the fields config and each value is the user-provided input. |
| `error` | object | Emitted when form submission fails validation or the payload cannot be parsed. Contains message (string) and field (string, optional) identifying which field caused the failure. |

## Example

```json
{
  "nodeType": "form_input_trigger",
  "config": {
    "formId": "battle-feedback-form",
    "title": "Submit Battle Feedback",
    "fields": [
      {
        "name": "topic",
        "label": "Battle Topic",
        "type": "text",
        "required": true
      },
      {
        "name": "difficulty",
        "label": "Difficulty",
        "type": "select",
        "required": true,
        "options": [
          "easy",
          "medium",
          "hard"
        ]
      },
      {
        "name": "allowPublic",
        "label": "Make results public",
        "type": "boolean",
        "required": false
      }
    ],
    "submitLabel": "Start Battle",
    "allowMultipleSubmissions": false
  }
}
```
