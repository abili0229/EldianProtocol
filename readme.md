# 🛡️ Eldian Protocol - Interface Tática (Attack on Titan)

Uma aplicação web interativa baseada no universo de **Attack on Titan (Shingeki no Kyojin)**. O projeto conta com uma interface tática de comunicação alimentada por IA via Azure OpenAI e um minigame interativo de tomada de decisões com múltiplos cenários e níveis de dificuldade.

---

## 🛠️ Tecnologias Utilizadas

* **HTML5:** Estrutura e semântica do painel tático.
* **CSS3:** Estilização responsiva, layout em grid/flexbox e identidade visual temática.
* **JavaScript (ES6+):** Lógica da aplicação, manipulação de DOM, integração com API assíncrona (`fetch`) e persistência em `localStorage`/`sessionStorage`.
* **Font Awesome:** Ícones da interface tática.
* **Azure OpenAI Service:** Integração com o modelo `gpt-4.1-mini` configurado sob o arquétipo de assistente militar eldiano.

---

## 📁 Estrutura do Projeto

```text
ELDIANPROTOCOL/
├── .gitignore            # Arquivos ignorados pelo Git (ex: keys.json)
├── .gitattributes        # Configurações de normalização de texto
├── README.md             # Documentação e guia do repositório
├── index.html            # Estrutura principal da página
├── style.css            # Estilos e temas visuais
├── script.js             # Lógica do Chat, integração com IA e Minigame
├── eldian.jpg            # Imagem de logo/banner
├── fundo.jpg             # Imagem de plano de fundo
└── keys.json             # (Não versionado) Arquivo local com a chave de API

### ⚙️ Configuração do `keys.json` (Chave e Endpoint)

Para conectar o projeto à Azure OpenAI, crie o arquivo **`keys.json`** na raiz do projeto com o seguinte formato:

```json
{
  "API_KEY": "SUA_CHAVE_AQUI",
  "ENDPOINT": "[https://SEU-RECURSO.openai.azure.com/](https://SEU-RECURSO.openai.azure.com/)"
}