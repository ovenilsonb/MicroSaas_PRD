# Módulo Fornecedores – Regras

## Campos obrigatórios
- name (texto)
- Os demais (cnpj, email, phone, address, city, state, notes) são opcionais.

## Validações
- CNPJ: validar formato (apenas aviso, não bloquear).

## Relacionamentos
- Um fornecedor pode ter muitos insumos (`supplier_id` em `ingredients`).
- Ao exibir um insumo, mostrar nome do fornecedor.

## Interface
- Preservar o componente `Fornecedores.tsx` atual.
- Conectar ao `fornecedorService` (storage `ohana_fornecedores`).