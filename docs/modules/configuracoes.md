# Módulo Configurações – Já existente

A tela de Configurações (`activeMenu === 'configuracoes'`) já possui:
- Seção "Backup e Restauração" com botões.
- Seção "Script SQL de Configuração" (para futuro Supabase).

## Regras
- Não modificar o layout nem os textos dessas seções.
- Implementar a lógica dos botões `Gerar Arquivo de Backup` e `Restaurar Dados` usando o `backupService`.
- O script SQL deve permanecer visível, mas não utilizado no momento.