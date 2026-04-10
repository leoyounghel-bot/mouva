import { validateAndFixSchemas, AiTemplateSchema } from './AiDesignerLogic';

describe('AiDesigner Validation Logic', () => {
  test('AiTemplateSchema should validate correct schema', () => {
    const validData = {
      basePdf: { width: 210, height: 297, padding: [10, 10, 10, 10] },
      schemas: [[
        { name: 'test1', type: 'text', position: { x: 0, y: 0 }, width: 10, height: 10 }
      ]]
    };
    const result = AiTemplateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  test('AiTemplateSchema should fail invalid schema', () => {
    const invalidData = {
      schemas: [[
        { name: 'test1', type: 'text', position: { x: 0 }, width: 10 } // Missing y and height
      ]]
    };
    const result = AiTemplateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  test('validateAndFixSchemas should enforce unique names', () => {
    const inputSchemas = [[
      { name: 'field', type: 'text', position: {x:0, y:0}, width:10, height:10 },
      { name: 'field', type: 'text', position: {x:0, y:0}, width:10, height:10 },
      { name: 'other', type: 'text', position: {x:0, y:0}, width:10, height:10 },
      { name: 'field', type: 'text', position: {x:0, y:0}, width:10, height:10 }
    ]];

    const fixed = validateAndFixSchemas(inputSchemas);
    const names = fixed[0].map((item: any) => item.name);
    
    expect(names).toEqual(['field', 'field_1', 'other', 'field_2']);
  });

  test('validateAndFixSchemas should handle defaults', () => {
    const inputSchemas = [[
      { name: 'field', type: 'text', position: {x:0, y:0}, width:10, height:10 }
    ]];
    const fixed = validateAndFixSchemas(inputSchemas);
    expect(fixed[0][0].opacity).toBe(1);
    expect(fixed[0][0].rotate).toBe(0);
  });
});
