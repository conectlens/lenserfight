---
title: Translator
description: Translates text from one language to another.
---

# Translator

## Overview

The Translator node translates text from one language to another using a configured translation provider. Use it in workflows that process multilingual battle prompts, judge responses, or user-submitted content. Translation is performed synchronously on the input text; if the provider returns an error or the target language is unsupported, execution routes to the error output. No credentials are required for built-in providers, but third-party integrations (e.g. DeepL, Google Translate) require an API key configured on the node or via a workspace secret.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `provider` | enum | No | Translation provider to use. Accepted values: built-in, deepl, google. Defaults to built-in. |
| `targetLanguage` | string | Yes | BCP-47 language tag for the desired output language (e.g. "fr", "de", "ja"). |
| `sourceLanguage` | string | No | BCP-47 language tag for the input language. When omitted, the provider auto-detects the source language. |
| `apiKey` | string | No | API key for third-party providers (DeepL, Google). Leave empty when using built-in or when the key is stored as a workspace secret. |
| `preserveFormatting` | boolean | No | When true, the provider attempts to preserve whitespace, line breaks, and inline markup in the translated output. Defaults to false. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | string | The text to translate. Must be a non-empty string. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | string | The translated text in the target language. |
| `error` | object | Emitted when translation fails (e.g. unsupported language, provider error, invalid API key). Contains message and code fields. |

## Example

```json
{
  "nodeType": "translator",
  "config": {
    "provider": "deepl",
    "targetLanguage": "fr",
    "sourceLanguage": "en",
    "preserveFormatting": true
  }
}
```
