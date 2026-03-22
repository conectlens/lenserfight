import type { ContentPart, ProviderMessage } from './types';

// ─── Model Capability Contract ────────────────────────────────────────────────
// This lives in TypeScript, NOT in the database.
// The database stores input_modalities TEXT[] and output_modalities TEXT[] on
// ai.models which feed into ModelCapabilities at runtime.

export interface ModelCapabilities {
  /** e.g. ['text', 'image', 'document', 'audio'] */
  inputModalities: string[];
  /** e.g. ['text', 'image'] */
  outputModalities: string[];
  supportsTools: boolean;
  supportsJsonSchema: boolean;
  supportsStreaming: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ─── CapabilityMapper ─────────────────────────────────────────────────────────
// GRASP Information Expert: this class owns all knowledge about whether a given
// set of inputs is compatible with a model's declared capabilities.
// Callers (CLI, Lab UI, execution controller) call validate() BEFORE dispatching
// to surface errors without consuming credits.

export class CapabilityMapper {
  /**
   * Validates that the messages can be processed by the given model.
   * Returns an empty array when everything is compatible.
   */
  validate(messages: ProviderMessage[], model: ModelCapabilities): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const msg of messages) {
      if (typeof msg.content === 'string') continue;
      for (const part of msg.content) {
        this.validatePart(part, model, errors);
      }
    }

    return errors;
  }

  private validatePart(
    part: ContentPart,
    model: ModelCapabilities,
    errors: ValidationError[]
  ): void {
    switch (part.type) {
      case 'image':
        if (!model.inputModalities.includes('image')) {
          errors.push({
            field: 'content',
            message: `This model does not accept image input. Supported: ${model.inputModalities.join(', ')}`,
          });
        }
        break;
      case 'document':
        if (!model.inputModalities.includes('document')) {
          errors.push({
            field: 'content',
            message: `This model does not accept document input. Supported: ${model.inputModalities.join(', ')}`,
          });
        }
        break;
      case 'audio':
        if (!model.inputModalities.includes('audio')) {
          errors.push({
            field: 'content',
            message: `This model does not accept audio input. Supported: ${model.inputModalities.join(', ')}`,
          });
        }
        break;
    }
  }

  /** Validates that the model can produce the requested output type. */
  validateOutput(requestedOutputType: string, model: ModelCapabilities): ValidationError[] {
    if (!model.outputModalities.includes(requestedOutputType)) {
      return [
        {
          field: 'output_type',
          message: `Model cannot produce '${requestedOutputType}' output. Supported: ${model.outputModalities.join(', ')}`,
        },
      ];
    }
    return [];
  }
}

export const capabilityMapper = new CapabilityMapper();
