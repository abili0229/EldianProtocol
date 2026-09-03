let AZURE_API_KEY = "";
let AZURE_ENDPOINT = "";

async function loadApiKey() {
  try {
    const response = await fetch('./keys.json');
    const data = await response.json();
    AZURE_API_KEY = data.API_KEY;
    AZURE_ENDPOINT = data.ENDPOINT;
  } catch (error) {
    console.error("Erro ao carregar keys.json:", error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadApiKey();

  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const welcomeScreen = document.getElementById('welcome-screen');
  const chatContainer = document.getElementById('chat-container');
  const historySelectorContainer = document.getElementById('history-selector-container');
  let currentSessionId = sessionStorage.getItem('eldian_current_session_id');
  let currentMode = 'chat';

  if (!currentSessionId) {
    currentSessionId = 'session_' + Date.now();
    sessionStorage.setItem('eldian_current_session_id', currentSessionId);
  }

  let messagesList = document.getElementById('messages-list');
  if (!messagesList) {
    messagesList = document.createElement('div');
    messagesList.id = 'messages-list';
    chatContainer.insertBefore(messagesList, chatForm);
  }

  // --- GERENCIAMENTO DE MENSAGENS E PERSISTÊNCIA ---

  function getAllSessions() {
    return JSON.parse(localStorage.getItem('eldian_sessions') || '{}');
  }

  function saveMessageToCurrentSession(text, sender) {
    const sessions = getAllSessions();
    if (!sessions[currentSessionId]) {
      sessions[currentSessionId] = {
        id: currentSessionId,
        startDate: new Date().toLocaleString('pt-BR'),
        firstMessage: text,
        messages: []
      };
    }
    sessions[currentSessionId].messages.push({ text, sender });
    localStorage.setItem('eldian_sessions', JSON.stringify(sessions));
  }

  function appendMessage(text, sender) {
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    messagesList.classList.remove('hidden');

    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', `${sender}-message`);

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.innerText = text;

    msgDiv.appendChild(contentDiv);
    messagesList.appendChild(msgDiv);

    messagesList.scrollTop = messagesList.scrollHeight;
  }

  function loadSessionMessages(sessionId) {
    currentSessionId = sessionId;
    sessionStorage.setItem('eldian_current_session_id', currentSessionId);
    messagesList.innerHTML = '';
    
    const sessions = getAllSessions();
    const session = sessions[sessionId];

    if (session && session.messages && session.messages.length > 0) {
      if (welcomeScreen) welcomeScreen.style.display = 'none';
      session.messages.forEach(msg => {
        appendMessage(msg.text, msg.sender);
      });
    } else {
      if (welcomeScreen) welcomeScreen.style.display = 'flex';
    }
  }

  // Carrega o histórico ao iniciar
  loadSessionMessages(currentSessionId);

  // --- CHAMADA À API DA IA ---

  async function enviarParaIA(mensagemUsuario) {
    const sessions = getAllSessions();
    const sessionActual = sessions[currentSessionId] || { messages: [] };

    const historico = [
      {
        role: "system",
        content: "Você é um assistente tático do universo de Attack on Titan (Shingeki no Kyojin). Você DEVE responder SOMENTE sobre assuntos relacionados a Attack on Titan. Se o usuário perguntar sobre qualquer outro assunto, recuse educadamente dentro do personagem da Guarnição ou Tropa de Exploração."
      }
    ];

    sessionActual.messages.forEach(msg => {
      historico.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    });

    historico.push({ role: 'user', content: mensagemUsuario });

    const url = "https://chatuhul.openai.azure.com/openai/deployments/gpt-4.1-mini/chat/completions?api-version=2024-08-01-preview";

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_API_KEY
        },
        body: JSON.stringify({
          messages: historico,
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        console.error("Detalhes do erro na API Azure:", response.status, errorDetail);

        const avisosProibidos = [
          "Protocolo de segurança acionado: este assunto viola as diretrizes da Guarnição.",
          "Acesso negado pelo comando tático. Esse tipo de conteúdo não é permitido.",
          "Ordem rejeitada: o sistema bloqueou o processamento deste tema por restrições operacionais.",
          "Alerta da Patrulha: conteúdo restrito detectado. Insira um comando válido para continuar."
        ];
        
        const avisoAleatorio = avisosProibidos[Math.floor(Math.random() * avisosProibidos.length)];
        
        appendMessage(avisoAleatorio, 'bot');
        saveMessageToCurrentSession(avisoAleatorio, 'bot');
        return;
      }

      const data = await response.json();

      if (data.choices && data.choices[0] && data.choices[0].message) {
        const textoIA = data.choices[0].message.content;
        appendMessage(textoIA, 'bot');
        saveMessageToCurrentSession(textoIA, 'bot');
      } else {
        appendMessage("Erro ao processar resposta da IA.", 'bot');
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      appendMessage("Erro de conexão ou bloqueio de rede no navegador.", 'bot');
    }
  }

  // --- EVENTO DE ENVIO DO CHAT ---

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    if (currentMode === 'minigame') {
      appendMessage(text, 'user');
      processMinigameInput(text);
      chatInput.value = '';
      return;
    }

    appendMessage(text, 'user');
    saveMessageToCurrentSession(text, 'user');
    chatInput.value = '';

    enviarParaIA(text);
  });

  // --- MENU LATERAL & NAVEGAÇÃO ---

  const menuRelatorio = document.getElementById('menu-relatorio');
  const menuMapeamento = document.getElementById('menu-mapeamento');
  const menuAnomalia = document.getElementById('menu-anomalia');
  const btnNewExpedition = document.getElementById('btn-new-expedition');
  const allMenuLinks = document.querySelectorAll('.history-menu a, .sidebar-footer a');

  function setActiveMenu(activeLink) {
    allMenuLinks.forEach(link => link.classList.remove('active'));
    if (activeLink) activeLink.classList.add('active');
    
    chatInput.scrollIntoView({ behavior: 'smooth' });
    chatInput.focus();
  }

  function restoreChatView() {
    currentMode = 'chat';
    if (historySelectorContainer) historySelectorContainer.classList.add('hidden');
    messagesList.classList.remove('hidden');
    
    // Recarrega as mensagens gravadas na sessão atual
    loadSessionMessages(currentSessionId);
  }

  function startNewExpedition() {
    currentMode = 'chat';
    currentSessionId = 'session_' + Date.now();
    sessionStorage.setItem('eldian_current_session_id', currentSessionId);
    
    messagesList.innerHTML = '';
    if (historySelectorContainer) historySelectorContainer.classList.add('hidden');
    messagesList.classList.remove('hidden');
    if (welcomeScreen) welcomeScreen.style.display = 'flex';
    
    setActiveMenu(menuRelatorio);
  }

  if (btnNewExpedition) btnNewExpedition.addEventListener('click', startNewExpedition);

  if (menuRelatorio) {
    menuRelatorio.addEventListener('click', (e) => {
      e.preventDefault();
      restoreChatView();
      setActiveMenu(menuRelatorio);
    });
  }

  if (menuMapeamento) {
    menuMapeamento.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveMenu(menuMapeamento);

      messagesList.classList.add('hidden');
      if (welcomeScreen) welcomeScreen.style.display = 'none';

      if (historySelectorContainer) {
        historySelectorContainer.innerHTML = '';
        historySelectorContainer.classList.remove('hidden');

        const header = document.createElement('h3');
        header.style.color = '#fff';
        header.style.marginBottom = '15px';
        header.innerText = 'Relatório das últimas missões';
        historySelectorContainer.appendChild(header);

        const sessions = getAllSessions();
        const sessionKeys = Object.keys(sessions).reverse();

        if (sessionKeys.length === 0) {
          const emptyMsg = document.createElement('p');
          emptyMsg.style.color = '#a8b0ac';
          emptyMsg.innerText = 'Nenhuma missão gravada anteriormente.';
          historySelectorContainer.appendChild(emptyMsg);
          return;
        }

        sessionKeys.forEach(key => {
          const session = sessions[key];
          const card = document.createElement('div');
          card.classList.add('history-card');

          const title = document.createElement('h4');
          title.innerText = `Missão: "${session.firstMessage || 'Conversa sem título'}"`;

          const dateInfo = document.createElement('small');
          dateInfo.innerText = `Iniciada em: ${session.startDate}`;

          card.appendChild(title);
          card.appendChild(dateInfo);

          card.addEventListener('click', () => {
            loadSessionMessages(key);
            restoreChatView();
            setActiveMenu(menuRelatorio);
          });

          historySelectorContainer.appendChild(card);
        });
      }
    });
  }

  const menuConfig = document.getElementById('menu-config');
  if (menuConfig) {
    menuConfig.addEventListener('click', (e) => {
      e.preventDefault();
      restoreChatView();
      setActiveMenu(menuConfig);
      appendMessage("Acessando painel de configurações táticas. Escolha uma nova expedição para resetar a vista atual.", 'bot');
    });
  }

  const menuSuporte = document.getElementById('menu-suporte');
  if (menuSuporte) {
    menuSuporte.addEventListener('click', (e) => {
      e.preventDefault();
      restoreChatView();
      setActiveMenu(menuSuporte);
      appendMessage("Suporte Tático da Guarnição ativado. Digite sua dúvida no rádio abaixo.", 'bot');
    });
  }

  // --- MINIGAME PROCEDURAL MULTI-ARQUÉTIPO ---

  let gameState = 'SELECIONANDO_DIFICULDADE';
  let dificuldade = 'medio';
  let faseAtual = 1;
  let vidas = 1;
  let cenarioAtual = null;

  function gerarCenarioAleatorio() {
    const tiposTitan = ["Titã Blindado Anormal", "Titã Quadrúpede Voraz", "Titã Saltador Urbano", "Titã Deformado Gigante", "Titã Escalador de Muralhas", "Titã Fêmea Ágil", "Titã Mandíbula"];
    const titanEscolhido = tiposTitan[Math.floor(Math.random() * tiposTitan.length)];

    const arquetipos = [
      {
        nome: `Florestas Gigantes (${titanEscolhido})`,
        detalhes: `SITUAÇÃO NA FLORESTA: Um ${titanEscolhido} de grande porte espreita entre as copas das árvores colossais. A visibilidade é baixa devido à névoa de vapor quente.`,
        fases: [
          {
            desc: "FASE 1: APROXIMAÇÃO AÉREA\nO Titã salta entre os galhos em direção ao seu ponto de ancoragem.",
            opcoes: [
              { txt: "Disparar ganchos diretamente no peito do Titã", certa: false, motivo: "O Titã puxou os cabos e desestabilizou seu voo com o DMT." },
              { txt: "Desviar em curva fechada usando a inércia do tronco lateral", certa: true },
              { txt: "Soltar os cabos e cair em queda livre na vegetação", certa: false, motivo: "O impacto no solo comprometeu seus equipamentos de manobra." }
            ]
          },
          {
            desc: "FASE 2: DEFESA DO ALVO\nO monstro protegeu a nuca endurecendo os braços com vapor denso.",
            opcoes: [
              { txt: "Empregar Lança do Trovão na junção do ombro para forçar a abertura", certa: true },
              { txt: "Tentar cortar os dedos da mão com lâminas comuns", certa: false, motivo: "As lâminas quebraram instantaneamente contra a pele blindada." },
              { txt: "Esperar o Titã perder o fôlego no mesmo galho", certa: false, motivo: "O peso do Titã quebrou o galho e cobriu a área com escombros." }
            ]
          },
          {
            desc: "FASE 3: MOMENTO DECISIVO\nA nuca está visível por breves instantes!",
            opcoes: [
              { txt: "Realizar estocada frontal cega na testa", certa: false, motivo: "A testa era apenas uma distração; o ponto vital não foi atingido." },
              { txt: "Girar em parafuso com gás máximo para um corte duplo na nuca", certa: true },
              { txt: "Arremessar lâminas restantes de longe", certa: false, motivo: "O arremesso manual não teve força suficiente para perfurar." }
            ]
          }
        ]
      },
      {
        nome: `Ruínas Urbanas de Shiganshina (${titanEscolhido})`,
        detalhes: `SITUAÇÃO URBANA: Ruas estreitas e escombros cercam a posição. Um ${titanEscolhido} bloqueia o único acesso ao distrito residencial.`,
        fases: [
          {
            desc: "FASE 1: INVESTIDA FRONTAL\nO Titã corre em disparada derrubando edifícios e escombros na sua direção.",
            opcoes: [
              { txt: "Tentar passar por baixo das pernas do Titã correndo", certa: false, motivo: "O Titã desferiu um pisão devastador no solo, bloqueando a passagem." },
              { txt: "Subir rapidamente pela fachada da torre de relógio e pegar altura", certa: true },
              { txt: "Ficar parado e disparar tiros de sinalizador de fumaça", certa: false, motivo: "O sinalizador ignorou a ameaça e o Titã colidiu com sua posição." }
            ]
          },
          {
            desc: "FASE 2: BLOQUEIO TÁTICO\nO Titã se apoia nas paredes estreitas, fechando o corredor de fuga.",
            opcoes: [
              { txt: "Lançar cilindro de gás vazio no rosto e usar gancho de desvio", certa: true },
              { txt: "Atacar os calcanhares de frente no chão plano", certa: false, motivo: "Sem cobertura, o Titã agarrou você no ar." },
              { txt: "Gritar ordens para distrair o monstro", certa: false, motivo: "Titãs anormais ignoram gritos e focam no alvo mais próximo." }
            ]
          },
          {
            desc: "FASE 3: ABATE FINAL\nO ponto fraco na nuca está exposto no topo da torre!",
            opcoes: [
              { txt: "Cortar apenas o tendão de Aquiles", certa: false, motivo: "O Titã caiu sentado, mas continuou girando e atacando." },
              { txt: "Aproveitar a gravidade da torre para um mergulho com corte fatal na nuca", certa: true },
              { txt: "Disparar cartuchos de fumaça preta na nuca", certa: false, motivo: "Fumaça não causa dano físico ao tecido do Titã." }
            ]
          }
        ]
      },
      {
        nome: `Desfiladeiro Rochoso (${titanEscolhido})`,
        detalhes: `SITUAÇÃO DE MONTANHA: O terreno é íngreme e rochoso. Um ${titanEscolhido} aguarda nas saliências superiores, preparando uma emboscada.`,
        fases: [
          {
            desc: "FASE 1: EMBOSCADA NA ENCOSTA\nO Titã arremessa pedras gigantescas do alto do penhasco.",
            opcoes: [
              { txt: "Escalar em zigue-zague usando as fendas das rochas como cobertura", certa: true },
              { txt: "Subir em linha reta pelo centro do paredão rochoso", certa: false, motivo: "Uma pedra colossal atingiu diretamente sua rota de subida." },
              { txt: "Recuar descendo o desfiladeiro correndo", certa: false, motivo: "Você ficou encurralado no fundo do cânion sem pontos de ancoragem." }
            ]
          },
          {
            desc: "FASE 2: CONFRONTOS EM ALTITUDE\nO Titã tenta agarrar seus cabos de DMT com as mãos abertas.",
            opcoes: [
              { txt: "Cortar os dedos das duas mãos do Titã com cortes cruzados rápidos", certa: true },
              { txt: "Manter os cabos presos e puxar com força total", certa: false, motivo: "A tração excessiva rompeu seus ganchos de aço." },
              { txt: "Soltar os dois ganchos e planar sem controle", certa: false, motivo: "Você bateu contra a parede do penhasco." }
            ]
          },
          {
            desc: "FASE 3: GOLPE DE MISERICÓRDIA\nO monstro está desequilibrado na beirada do precipício!",
            opcoes: [
              { txt: "Empurrar o Titã com os pés", certa: false, motivo: "A massa corporal do Titã é imensa; o empurrão não surtiu efeito." },
              { txt: "Desferir um corte certeiro e profundo na nuca usando propulsão dupla", certa: true },
              { txt: "Esperar o sol nascer para cegar o Titã", certa: false, motivo: "Titãs não dependem da luz solar para se mover nesta altitude." }
            ]
          }
        ]
      }
    ];

    return arquetipos[Math.floor(Math.random() * arquetipos.length)];
  }

  if (menuAnomalia) {
    menuAnomalia.addEventListener('click', (e) => {
      e.preventDefault();
      setActiveMenu(menuAnomalia);
      iniciarMinigame();
    });
  }

  function iniciarMinigame() {
    currentMode = 'minigame';
    gameState = 'SELECIONANDO_DIFICULDADE';
    faseAtual = 1;
    vidas = 1;

    cenarioAtual = gerarCenarioAleatorio();

    messagesList.innerHTML = '';
    if (historySelectorContainer) historySelectorContainer.classList.add('hidden');
    messagesList.classList.remove('hidden');
    if (welcomeScreen) welcomeScreen.style.display = 'none';

    appendMessage("SELEÇÃO DE DIFICULDADE DA OPERAÇÃO\nEscolha o nível tático para iniciar o desafio:", 'bot');

    renderButtons([
      { label: "1 - Fácil (Esquadrão de Elite • Dicas + 2 Vidas❤️)", val: "1" },
      { label: "2 - Médio (Operação Padrão • Sem Dicas + 1 Vida❤️)", val: "2" },
      { label: "3 - Difícil (Modo Sobrevivência • Sem Erros💀)", val: "3" }
    ]);
  }

  function renderButtons(options) {
    removeButtons();

    const btnContainer = document.createElement('div');
    btnContainer.id = 'interactive-options-container';

    options.forEach(opt => {
      const button = document.createElement('button');
      button.classList.add('game-option-btn');
      button.innerText = opt.label;
      button.addEventListener('click', () => {
        appendMessage(opt.label, 'user');
        processMinigameInput(opt.val);
      });
      btnContainer.appendChild(button);
    });

    messagesList.appendChild(btnContainer);
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  function removeButtons() {
    const oldContainer = document.getElementById('interactive-options-container');
    if (oldContainer) oldContainer.remove();
  }

  function processMinigameInput(input) {
    removeButtons();

    if (gameState === 'FIM_DE_JOGO') {
      if (input === '1') {
        iniciarMinigame();
      } else {
        appendMessage("Selecione a opção de reiniciar para tentar uma nova missão.", 'bot');
        renderButtons([{ label: "1 - Reiniciar Simulação Tática", val: "1" }]);
      }
      return;
    }

    if (gameState === 'SELECIONANDO_DIFICULDADE') {
      if (input === '1') {
        dificuldade = 'facil';
        vidas = 2;
      } else if (input === '2') {
        dificuldade = 'medio';
        vidas = 1;
      } else if (input === '3') {
        dificuldade = 'dificil';
        vidas = 1;
      } else {
        appendMessage("Comando inválido. Selecione uma opção válida.", 'bot');
        renderButtons([
          { label: "1 - Fácil (Esquadrão de Elite • Dicas + 2 Vidas)", val: "1" },
          { label: "2 - Médio (Operação Padrão • Sem Dicas + 1 Vida)", val: "2" },
          { label: "3 - Difícil (Modo Sobrevivência • Sem Erros)", val: "3" }
        ]);
        return;
      }

      gameState = 'JOGANDO';

      appendMessage(
        `ALERTA DE EMERGÊNCIA: SETOR DE OPERAÇÃO ATIVADO\n\n` +
        `LOCAL/AMEAÇA: ${cenarioAtual.nome}\n\n` +
        `${cenarioAtual.detalhes}`,
        'bot'
      );

      setTimeout(exibirFase, 900);
      return;
    }

    if (gameState === 'JOGANDO') {
      if (input !== '1' && input !== '2' && input !== '3') {
        appendMessage("Comando não reconhecido. Selecione um botão válido.", 'bot');
        exibirFase();
        return;
      }
      executarTurno(input);
    }
  }

  function exibirFase() {
    const faseData = cenarioAtual.fases[faseAtual - 1];
    let msg = `${faseData.desc}\n\n`;

    if (dificuldade === 'facil') {
      const idxCerta = faseData.opcoes.findIndex(o => o.certa);
      msg += `DICA TÁTICA DA ELITE: Analise os riscos. A opção recomendada é a de número ${idxCerta + 1}.\n\n`;
    }

    appendMessage(msg, 'bot');

    const btnOptions = faseData.opcoes.map((opt, i) => ({
      label: `${i + 1} - ${opt.txt}`,
      val: `${i + 1}`
    }));

    renderButtons(btnOptions);
  }

  function executarTurno(opcaoEscolhida) {
    const index = parseInt(opcaoEscolhida) - 1;
    const faseData = cenarioAtual.fases[faseAtual - 1];
    const escolha = faseData.opcoes[index];

    if (escolha && escolha.certa) {
      faseAtual++;
      if (faseAtual > cenarioAtual.fases.length) {
        appendMessage(
          "RELATÓRIO DE VITÓRIA TÁTICA:\n\n" +
          "Missão cumprida com sucesso! A ameaça foi neutralizada e o esquadrão retornou em segurança. Área liberada pela Guarnição.",
          'bot'
        );
        gameState = 'FIM_DE_JOGO';
        renderButtons([{ label: "1 - Iniciar Nova Missão Aleatória", val: "1" }]);
      } else {
        appendMessage("Manobra executada com sucesso! Avançando para a próxima fase...", 'bot');
        setTimeout(exibirFase, 600);
      }
    } else {
      vidas--;
      const motivoDerrota = escolha ? escolha.motivo : "Falha grave no cálculo do movimento.";

      if (vidas > 0) {
        appendMessage(`MANOBRA FALHOU: ${motivoDerrota}\n\nSeu esquadrão salvou você a tempo, mas você perdeu 1 vida! Tente novamente esta fase.`, 'bot');
        setTimeout(exibirFase, 600);
      } else {
        appendMessage(
          `RELATÓRIO DE DERROTA EM COMBATE:\n\n` +
          `MOTIVO DA FALHA: ${motivoDerrota}\n\n` +
          `RESULTADO DA MISSÃO: O plano falhou criticamente e a equipe teve que recuar. A simulação foi encerrada.`,
          'bot'
        );
        gameState = 'FIM_DE_JOGO';
        renderButtons([{ label: "1 - Iniciar Nova Missão Aleatória (Gerar Outro Cenário)", val: "1" }]);
      }
    }
  }
});