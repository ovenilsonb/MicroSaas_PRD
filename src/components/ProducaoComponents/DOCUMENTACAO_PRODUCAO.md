# Documentação Técnica: Módulo de Produção

## 🏗️ Arquitetura (Ohana Clean)

A estrutura do módulo foi decomposta para garantir manutenibilidade e escalabilidade, seguindo o padrão de separação de interesses (SOC).

### 📂 Estrutura de Arquivos
- `Producao.tsx`: Orquestrador principal.
- `ProducaoComponents/`
    - `hooks/`: Lógica de estado e efeitos.
    - `types/`: Definições de interfaces TypeScript.
    - `utils/`: Funções puras e constantes.
    - `ProductionStats.tsx`: UI de indicadores.
    - `ProductionTable.tsx`: UI de listagem.
    - `ProductionOrderForm.tsx`: UI de lançamentos.
    - `ProductionDetailsView.tsx`: UI de controle de processo.

---

## ⚙️ Funcionalidades Críticas

### 📦 Calculadora de Envase (`usePackagingCalculator`)
Utiliza um algoritmo de **backtracking** para sugerir combinações de embalagens que completam exatamente o volume planejado da fórmula.
- Prioriza embalagens de maior volume.
- Vincula automaticamente o rótulo correspondente ao frasco selecionado.

### 🧪 Baixa de Estoque (`useProductionActions`)
A baixa de estoque ocorre automaticamente no momento em que a OF transita para o status **'weighing' (Pesagem)**.
- Calcula a quantidade proporcional baseada no `planned_volume` versus `base_volume` da fórmula original.
- Gera logs de movimentação (`inventory_logs`) vinculados ao ID da OF.

### 🛡️ Integração com Qualidade
Ao transitar para o status **'quality_check'**, o sistema cria automaticamente um registro na tabela `quality_controls`. A OF permanece bloqueada para finalização até que o laudo técnico seja aprovado no módulo de Qualidade.

---

## 💾 Persistência de Dados (Rich Hybrid)

Para garantir que informações ricas (não previstas no esquema original do banco) não sejam perdidas, utilizamos o padrão **Rich Hybrid Persistence**:
- Dados estruturados básicos (status, volumes, datas) -> **Supabase**.
- Dados estendidos (checklists SOP, lotes de fornecedores, snapshots de fórmulas) -> **LocalStorage (`production_orders_ext`)**.

## 🎨 Estética (Royal Capsule)

- **Cards**: Bordas arredondadas (2xl), sombras suaves (`shadow-sm`) e cores vibrantes com fundos translúcidos.
- **Micro-animações**: Pulsos no status "Em Produção" e transições de `slide-in` para mudanças de visão.
