# Regras de Estabilidade do Projeto (Proíbem regressão)

## 1. Preservação absoluta da interface existente
- Cores atuais: sidebar `#202eac`, fundo `bg-slate-50`, textos `text-slate-800/900`, botões com estilos definidos no `App.tsx`.
- Ícones: usar exatamente os mesmos nomes de importação do `App.tsx` (ex: `Beaker`, `Calculator`).
- Layout: sidebar à esquerda, conteúdo principal à direita. Não mover elementos.
- Botões de navegação e seus `onClick` não devem ser alterados.

## 2. Proibição de refatorações não solicitadas
- Não converter componentes funcionais em classes.
- Não mudar a estrutura de pastas (`src/components/`, `src/lib/`).
- Não alterar a configuração do Tailwind.
- Não introduzir novas bibliotecas de estado (Redux, Context) sem autorização.

## 3. Adição de novas funcionalidades
- Sempre adicionar, nunca substituir.
- Novos componentes devem ser criados em arquivos separados.
- Novos estilos devem usar classes Tailwind já existentes.

## 4. Procedimento para mudanças maiores
- Se precisar modificar mais de 3 linhas ou mais de 1 arquivo, descreva o plano e aguarde confirmação.
- Exemplo: "Para adicionar campo X, vou modificar o arquivo Y. Posso continuar?"

## 5. Backup mental
- Antes de editar um arquivo, imagine que o conteúdo original deve ser mantido. Prefira sugerir o código novo em vez de sobrescrever.