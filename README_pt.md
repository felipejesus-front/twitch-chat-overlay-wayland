# Cosmic Twitch Chat

> **Projeto VibeCodado** — feito com vibes, IA e amor pelo Linux.

🌐 [English version](README.md)

---

## O que é isso?

Sabe aquela situação de estar jogando e querer ver o chat da Twitch sem precisar alt+tabbar, abrir o navegador, ou deixar uma janela sobreposta ocupando espaço na tela?

**Cosmic Twitch Chat** resolve exatamente isso.

É um overlay nativo para Linux (Wayland) que exibe o chat de um canal da Twitch **por cima do seu jogo**, com fundo transparente, sem browser, sem Electron, sem peso. Você vê as mensagens do chat em tempo real enquanto joga, sem atrapalhar a gameplay.

Construído com GJS + GTK4, ele se conecta diretamente ao IRC da Twitch via WebSocket — leve, rápido e sem dependência de conta ou token OAuth.

### Funcionalidades

- **Overlay transparente** — o chat flutua sobre qualquer janela
- **Fundo ajustável** — botão na barra para ciclar entre 4 níveis de opacidade da janela (`Ctrl+B`)
- **Mensagens com fundo próprio** — cada mensagem tem um fundo escuro semi-transparente para facilitar a leitura
- **Tempo real** — Twitch IRC via WebSocket, sem polling
- **Anônimo** — sem login, sem OAuth, somente leitura
- **Auto-reconexão** — recupera a conexão automaticamente se cair
- **Usernames coloridos** — cada usuário tem uma cor consistente
- **Fade-in suave** — mensagens aparecem com animação
- **Limite de mensagens** — mantém as últimas 50; as antigas são removidas automaticamente

---

## Instalação e uso

### 1. Instale as dependências

```bash
sudo apt install gjs gir1.2-gtk-4.0 gir1.2-soup-3.0 glib-networking
```

**Dependência opcional** — overlay nativo Wayland (ancora na borda direita da tela, sempre visível acima de outras janelas):

```bash
# Ubuntu 24.04+
sudo apt install libgtk4-layer-shell0 gir1.2-gtk4layershell-0.1

# Fedora / COSMIC OS
sudo dnf install gtk4-layer-shell

# Arch
sudo pacman -S gtk4-layer-shell
```

> Sem o `gtk4-layer-shell` o app funciona normalmente como uma janela comum — basta posicioná-la manualmente sobre o jogo.

### 2. Clone o repositório

```bash
git clone https://github.com/felipejesus-front/twitch-chat-overlay-wayland.git
cd cosmic-twitch-chat
```

### 3. Execute

```bash
gjs main.js <canal>
```

Exemplos:
```bash
gjs main.js gaules
gjs main.js '#gaules'   # com ou sem # — ambos funcionam
```

> **Importante:** execute sempre a partir da raiz do projeto.

### Atalhos

| Tecla | Ação |
|-------|------|
| `Esc` | Fechar o app |
| `Ctrl`+`Shift`+`C` | Limpar o chat |
| `Ctrl`+`B` | Ciclar opacidade do fundo da janela |

---

## Estrutura do projeto

```
cosmic-twitch-chat/
├── main.js                 Entry point — validação de args, GTK Application
├── ui/
│   ├── window.js           Janela, barra de controle, atalhos, IRC
│   ├── chat_view.js        Lista de mensagens com scroll
│   └── styles.css          Estilos do overlay
├── services/
│   └── twitch_irc.js       Cliente WebSocket IRC com auto-reconexão
└── utils/
    └── parser.js           Parser de linhas IRC brutas
```

---

## Notas sobre Wayland

- **Transparência** funciona automaticamente em qualquer compositor RGBA (COSMIC, Mutter, KWin Wayland).  
  Se aparecer fundo preto, verifique se o compositor tem transparência habilitada e confirme que está em Wayland: `echo $XDG_SESSION_TYPE`
- **Always-on-top** no Wayland não é garantido via API padrão do GTK. Com `gtk4-layer-shell` instalado, a janela usa uma superfície de layer-shell real e fica sempre acima das demais sem roubar foco.
- **XWayland / X11** também é suportado — use o "sempre no topo" do seu gerenciador de janelas.

---

## Melhorias futuras

- [ ] Suporte a emotes (BetterTTV / FFZ / 7TV)
- [ ] Badges de inscrito, moderador, broadcaster
- [ ] Click-through — mouse passa direto para o app por baixo
- [ ] Arquivo de configuração (fonte, opacidade, largura, canal)
- [ ] Multi-canal com abas
- [ ] Destaque de menções do seu username
