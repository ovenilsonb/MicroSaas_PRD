# Documentação Técnica: Módulo Proporção

Este documento detalha a arquitetura, regras de negócio e estrutura do módulo de Proporção, após a refatoração para o padrão modular "Ohana Clean".

## 🏗️ Arquitetura do Módulo

O módulo foi decomposto de um arquivo único de 685 linhas para uma estrutura de componentes e ganchos (hooks) especializados, reduzindo o arquivo principal significativamente e melhorando a separação de interesses.

### 🪝 Camada de Lógica (Hooks)

1.  **`useProporcaoData`**: Gerencia o carregamento de fórmulas ativas e a descoberta de opções de embalagem baseada nos insumos.
2.  **`useCalculation`**: O coração matemático do módulo. Realiza conversões de volume total para componentes individuais e alocação de embalagens.
3.  **`useSimulation`**: Gerencia o histórico de simulações (Memorial de Cálculo) persistido localmente.
4.  **`useProporcaoFilters`**: Controla o estado de busca e ordenação da galeria de fórmulas.
5.  **`useProporcaoUI`**: Coordena estados de visualização e controle de modais de sucesso/erro.

### 🧱 Componentes de Interface

-   **`ProporcaoGallery`**: Tela inicial com busca avançada e seleção de fórmulas.
-   **`ProporcaoCalculatorHeader`**: Cabeçalho de ações da calculadora.
-   **`ProporcaoCalculatorSidebar`**: Painel lateral de configuração de metas e histórico.
-   **`ProporcaoSummary`**: Resumo executivo de custos e volumes calculados.
-   **`MemorialComposicao`**: Tabela detalhada de ingredientes e custos unitários resultantes.

## ⚖️ Regras de Negócio e Cálculos

### 1. Modos de Cálculo
O sistema opera em dois modos mutuamente exclusivos:
-   **Volume Fixo**: O usuário define quanto quer produzir (ex: 500L) e o sistema calcula quantas embalagens são necessárias.
-   **Quantidade de Peças**: O usuário define quantas unidades quer produzir (ex: 500 frascos) e o sistema calcula o volume total necessário.

### 2. Seleção Inteligente de Embalagem
Ao selecionar uma sugestão de montagem, o sistema tenta identificar automaticamente:
-   A **Embalagem Primária** (Frasco/Bombona).
-   O **Rótulo/Etiqueta** correspondente (via busca de palavras-chave).

### 3. Memorial de Cálculo
Cada simulação salva gera um registro com:
-   `displayName`: Nome formatado contendo modo, volume e quantidade de unidades.
-   `ingredients`: Lista detalhada contendo custo proporcional e percentual de participação química.
-   `totalCost`: Soma dos insumos químicos + custos de embalagem/rótulo.

## 💾 Estrutura de Dados (Simulation)

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `formulaId` | String | ID da fórmula original |
| `formulaName`| String | Nome da fórmula na simulação |
| `targetVolume`| Number | Volume total produzido (L) |
| `targetQuantity`| Number | Quantidade total de unidades |
| `totalCost` | Number | Custo total da simulação |
| `displayName` | String | Nome identificador para histórico |

---

> [!NOTE]
> Este módulo agora utiliza o **ErrorBoundary Global**, garantindo que falhas em renderizações de fórmulas complexas não quebrem toda a aplicação.
