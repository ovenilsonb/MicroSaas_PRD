# Documentação: Módulo de Clientes (Modular)

Este módulo gerencia o banco de dados de clientes, segmentação comercial e dados logísticos. Foi refatorado para o padrão **Ohana Clean** para garantir escalabilidade e facilidade de manutenção.

## Estrutura de Pastas

```text
src/components/ClientesComponents/
├── hooks/
│   ├── useClientData.ts     # Busca de dados e cálculo de KPIs
│   ├── useClientActions.ts  # CRUD (Salvar/Excluir) e Backup (JSON)
│   └── useClientFilters.ts  # Lógica de busca e alternância de visualização
├── ClientModal/
│   ├── ClientModal.tsx      # Orquestrador do Modal
│   ├── ClientGeralTab.tsx   # Aba de dados Básicos/Endereço
│   └── ClientComercialTab.tsx # Aba de Tags e Preços
├── ClientStats.tsx          # Cards de Dashboard (KPIs)
├── ClientFiltersBar.tsx     # Barra de pesquisa e Filtros
├── ClientCard.tsx           # Visualização em Grade
├── ClientTable.tsx          # Visualização em Lista
├── clientUtils.ts           # Máscaras de CPF/CNPJ e Telefone
└── types.ts                 # Definições de interface
```

## Regras de Negócio e Lógica

### 1. Persistência Híbrida
O módulo detecta automaticamente o `mode` do `StorageModeContext`.
- **Supabase**: Realiza operações via API Rest.
- **LocalStorage**: Salva na chave `local_clients`.

### 2. Segmentação Comercial
Cada cliente possui um campo `tabela_preco` que define qual preço será aplicado automaticamente no módulo de **Vendas**.
- **Varejo**: Preço padrão.
- **Atacado**: Preço para revenda.
- **Fardo**: Preço para grandes volumes/distribuição.

### 3. Tags Dinâmicas
As tags são usadas para segmentação livre (ex: "VIP", "Lava Rápido"). Elas facilitam a filtragem futura e relatórios de nicho.

### 4. Backup e Portabilidade
O sistema permite exportar toda a base de clientes para um arquivo `.json` e reimportar em outra máquina ou após a mudança de modo de armazenamento.

---
> [!WARNING]
> **Validação de Documentos**: Atualmente o sistema aplica apenas máscaras visuais. A validação de dígitos verificadores (calculada) está desativada conforme solicitação do usuário.
