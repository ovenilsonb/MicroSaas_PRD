# Módulo Fórmulas – Regras

## Preservação
- Não alterar a estrutura do componente `Formulas.tsx` atual.
- Apenas substituir dados mockados por dados reais do `formulaService`.

## Estrutura de uma fórmula (armazenada)
```json
{
  "id": "uuid",
  "name": "string",
  "version": "V1",
  "status": "draft",
  "group_id": "uuid",
  "base_volume": 100,
  "ingredients": [
    { "ingredient_id": "uuid", "variant_id": null, "quantity": 10 }
  ],
  "yield_amount": 10,
  "yield_unit": "L",
  "instructions": "..."
}