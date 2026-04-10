import React from 'react';
import { isBlankPdf, replacePlaceholders, Template } from '@pdfme/common';
import Renderer from './Renderer.js';
import { uuid } from '../helper.js';

// Safely extract string content from schema.content (handles objects with content property)
const safeContent = (content: unknown): string => {
  if (content == null) return '';
  if (typeof content === 'string') return content;
  if (typeof content === 'number') return String(content);
  if (typeof content === 'object' && 'content' in content) {
    return safeContent((content as { content: unknown }).content);
  }
  return '';
};

const StaticSchema = (props: {
  template: Template;
  input: Record<string, string>;
  scale: number;
  totalPages: number;
  currentPage: number;
}) => {
  const {
    template: { schemas, basePdf },
    input,
    scale,
    totalPages,
    currentPage,
  } = props;
  if (!isBlankPdf(basePdf) || !basePdf.staticSchema) return null;
  return (
    <>
      {basePdf.staticSchema.map((schema) => (
        <Renderer
          key={schema.name}
          schema={{ ...schema, id: uuid() }}
          basePdf={basePdf}
          value={
            schema.readOnly
              ? replacePlaceholders({
                  content: safeContent(schema.content),
                  variables: { ...input, totalPages, currentPage },
                  schemas,
                })
              : safeContent(schema.content)
          }
          onChangeHoveringSchemaId={() => {
            void 0;
          }}
          mode={'viewer'}
          outline={`none`}
          scale={scale}
          selectable={false}
        />
      ))}
    </>
  );
};

export default StaticSchema;
