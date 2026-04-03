# Persistência Local – Regras para armazenamento e backup

## Tecnologia
- Pequenas listas (fornecedores, grupos) → `localStorage`
- Listas grandes (insumos, fórmulas, precificações) → `IndexedDB` (biblioteca `idb` ou `dexie`)

## Chaves de armazenamento (definidas)
- `ohana_insumos`
- `ohana_fornecedores`
- `ohana_grupos`
- `ohana_formulas`
- `ohana_precificacoes`

## Serviços (criar em `src/services/` se não existirem)
- `insumoService.ts`
- `fornecedorService.ts`
- `formulaService.ts`
- `backupService.ts`

## Regras de implementação
- Ao montar cada componente, carregar dados do storage.
- Após criar/editar/excluir, salvar imediatamente no storage.
- Não confiar em estado global volátil – persistir sempre.

## Exportação (Backup)
- Usar os botões já existentes na tela de Configurações (`Gerar Arquivo de Backup`).
- Coletar dados de todos os módulos e gerar um `.json` com estrutura:
```json
{
  "version": "1.0",
  "exported_at": "ISO string",
  "modules": {
    "insumos": [...],
    "fornecedores": [...],
    "grupos": [...],
    "formulas": [...],
    "precificacoes": [...]
  }
}