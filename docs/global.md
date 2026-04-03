# Ohana Clean – Regras Globais (versão estável)

## Stack (não mudar)
- React 18+ com TypeScript
- Vite
- Tailwind CSS (configuração atual permanece)
- Lucide React (ícones atuais não serão trocados)
- Sem backend externo – tudo local (localStorage/IndexedDB)

## Estrutura de pastas (não alterar)
src/
  components/     # Cada módulo em seu arquivo SEPARADO (Insumos.tsx, Formulas.tsx, etc.)
  lib/            # Apenas para futura integração com Supabase (não usar agora)
  App.tsx         # Não modificar a estrutura do componente App (sidebar, navegação, etc.)
  main.tsx

## Estilos (preservar)
- As cores atuais: sidebar `#202eac`, fundo `bg-slate-50`, textos `text-slate-800/900`.
- Botões, inputs, cards – manter os estilos existentes.
- **Nunca substituir classes Tailwind por outras equivalentes** (ex: trocar `bg-slate-50` por `bg-gray-100`).

## Commits
- Padrão Conventional Commits.
- Nunca fazer commit automático sem permissão.

## Persistência (local-first)
- Todos os dados salvos em localStorage/IndexedDB – NADA de Supabase durante o desenvolvimento.
- Implementar exportação/importação por módulo e global (já existente na tela de Configurações).