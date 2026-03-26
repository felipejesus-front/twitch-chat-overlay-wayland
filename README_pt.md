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

### 2. Instale ou compile gtk4-layer-shell (opcional, mas recomendado)

**gtk4-layer-shell** ativa o modo overlay nativo do Wayland: a janela do chat fica ancorada na borda da tela, permanece **sempre no topo**, e nunca rouba foco.

#### Para Fedora / COSMIC (DNF)
```bash
sudo dnf install gtk4-layer-shell
```

#### Para Arch
```bash
sudo pacman -S gtk4-layer-shell
```

#### Para Ubuntu 24.04+ (se disponível no seu mirror)
```bash
sudo add-apt-repository universe
sudo apt update
sudo apt install libgtk4-layer-shell0 gir1.2-gtk4layershell-0.1
```

#### Para Pop!_OS 24.04 ou se os pacotes não estiverem disponíveis
Os mirrors do Pop!_OS não incluem o pacote — compile do código-fonte:

```bash
# Instale as dependências de compilação
sudo apt install -y meson ninja-build gobject-introspection libwayland-dev \
  wayland-protocols libgtk-4-dev valac git

# Clone e compile
cd /tmp
git clone --depth=1 https://github.com/wmww/gtk4-layer-shell.git
cd gtk4-layer-shell
meson setup build -Dexamples=false -Ddocs=false -Dtests=false
ninja -C build
sudo ninja -C build install
sudo ldconfig

# Corrija o symbol lookup do GJS (conecte a lib ao diretório systemwide)
sudo ln -sf /usr/local/lib/x86_64-linux-gnu/girepository-1.0/Gtk4LayerShell-1.0.typelib \
  /usr/lib/x86_64-linux-gnu/girepository-1.0/Gtk4LayerShell-1.0.typelib
```

> **Sem gtk4-layer-shell:** o app funciona como uma janela comum — posicione-a manualmente sobre o jogo. Se a lib não for encontrada, a janela mostra um indicador `⚠ Overlay OFF`.
> Neste modo, atalhos de teclado (Esc, Ctrl+B, Ctrl+Shift+C) **funcionarão** porque a janela recebe foco.

### 3. Clone o repositório

```bash
git clone https://github.com/felipejesus-front/twitch-chat-overlay-wayland.git
cd cosmic-twitch-chat
```

### 4. Execute

```bash
gjs main.js <canal>
```

Exemplos:
```bash
gjs main.js gaules
gjs main.js '#gaules'   # com ou sem # — ambos funcionam
```

> **Importante:** execute sempre a partir da raiz do projeto.

### Alternativa: Instale globalmente

Em vez de rodar do diretório do projeto, você pode instalar o app sistematicamente:

#### Método A: Via make install
```bash
sudo make install      # instala em /usr/share e /usr/bin
cosmic-twitch-chat --set-channel gaules   # salva canal padrão
cosmic-twitch-chat     # executa com o canal salvo
```

#### Método B: Via pacote .deb
```bash
make deb               # gera build/cosmic-twitch-chat_1.0.0_all.deb
sudo dpkg -i build/cosmic-twitch-chat_1.0.0_all.deb
```

Após instalar, o app aparece no launcher do COSMIC como **"Cosmic Twitch Chat"**.

#### Método C: Defina um canal padrão
```bash
# Salve o canal para usar depois
gjs main.js --set-channel gaules

# Execute sem argumentos — usa o canal salvo
gjs main.js
```

O canal padrão é armazenado em `~/.config/cosmic-twitch-chat/channel`.

#### Desinstalar
```bash
sudo make uninstall    # se instalou via make install
# ou
sudo dpkg -r cosmic-twitch-chat   # se instalou via deb
```

### Fechando o overlay

Como o chat é transparente e deixa o mouse passar (click-through), atalhos de teclado não funcionam enquanto ele tem foco.

**Como fechar:**

- Via linha de comando:
  ```bash
  gjs main.js --quit    # encerra a instância em execução
  ```

- No terminal:
  ```bash
  Ctrl+C    # para o processo
  ```

- Atalho customizado no COSMIC:
  - Abra **Settings do COSMIC → Teclado → Atalhos**
  - Clique **+** para adicionar atalho
  - Configure **Comando** para: `gjs /usr/share/cosmic-twitch-chat/main.js --quit`
  - Associe a (ex) **Ctrl+Shift+Esc**

### Atalhos (modo legado)

Se você estiver executando em **modo não-overlay** (sem gtk4-layer-shell), os atalhos funcionam:

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

## Modo Overlay Wayland (gtk4-layer-shell)

### Como funciona

Quando **gtk4-layer-shell** está instalado, o app automaticamente:

1. **Auto-preload da lib** — `main.js` detecta a lib e se re-executa com `LD_PRELOAD` configurado, garantindo que a interceptação ocorra antes que GTK conecte ao compositor Wayland.
2. **Cria uma surface layer-shell** — em vez de uma janela normal, o app usa o protocolo Wayland `wl-layer-shell` para requisitar a camada `OVERLAY`.
3. **Ancora na borda da tela** — posicionada `12px` da borda direita, esticada verticalmente, sempre acima de tudo.
4. **Habilita modo de teclado** — configurado como `ON_DEMAND` para que os atalhos de teclado (`Esc`, `Ctrl+B`, `Ctrl+Shift+C`) funcionem em modo overlay.

### Diagnóstico

- **Sem aviso `⚠ Overlay OFF`** — lib está instalada e ativa.
- **Mostra `⚠ Overlay OFF`** — gtk4-layer-shell não encontrado. Instale-a (veja seção 2).
- **Transparência** funciona automaticamente em qualquer compositor RGBA (COSMIC, Mutter, KWin Wayland).  
  Se aparecer fundo preto, verifique se o compositor tem transparência habilitada: `echo $XDG_SESSION_TYPE` deve retornar `wayland`.
- **XWayland / X11** — também suportado sem gtk4-layer-shell; use o recurso "sempre no topo" do seu gerenciador de janelas.

---

## Melhorias futuras

- [ ] Suporte a emotes (BetterTTV / FFZ / 7TV)
- [ ] Badges de inscrito, moderador, broadcaster
- [ ] Arquivo de configuração (fonte, opacidade, largura, canal)
- [ ] Multi-canal com abas
- [ ] Destaque de menções do seu username
- [ ] Toggle de modo edição — tornar janela temporariamente móvel & focusável para reposicionamento

---

## Build & Empacotamento

### Requisitos

- `gjs` (runtime GNOME JavaScript)
- `gir1.2-gtk-4.0` e `gir1.2-soup-3.0` (bindings GObject Introspection)
- `make` (para construir o pacote)
- `dpkg-deb` (para gerar pacote .deb; vem com `dpkg`)

Todos são ferramentas leves de texto/script — nenhuma compilação necessária.

### Targets do Makefile

```bash
make install              # Instala globalmente em /usr/share e /usr/bin
make uninstall            # Remove instalação sistematicamente
make deb                  # Gera pacote .deb em build/
make clean                # Remove pasta build/
```

### Versão customizada no .deb

```bash
make deb VERSION=2.0.0    # Gera cosmic-twitch-chat_2.0.0_all.deb
```

### Para manutentores de distribuição

O pacote declara:
- **Depende de:** `gjs`, `gir1.2-gtk-4.0`, `gir1.2-soup-3.0`
- **Recomenda:** `gtk4-layer-shell` (opcional, mas altamente recomendado)
- **Arquitetura:** `all` (baseado em script, roda em qualquer sistema com GJS/GTK4)

Todos os arquivos são colocados em `/usr/share/cosmic-twitch-chat/` com um wrapper bash simples em `/usr/bin/cosmic-twitch-chat`.

---

## Detalhes Técnicos (mudanças v1.x)

### Melhorias principais

#### `main.js` — mecanismo de auto-preload & features CLI
- **Auto-preload:** Detecta se gtk4-layer-shell está disponível e se re-executa com `LD_PRELOAD` antes que GTK conecte ao Wayland.
- **Busca em múltiplos caminhos:** Procura a lib em locais padrão: `/usr/local/lib/...`, `/usr/lib/...`, `/usr/lib64/...`
- **Flag `--quit`:** Lê o PID de `~/.cache/cosmic-twitch-chat/pid` e envia sinal `kill` para a instância em execução.
- **Flag `--set-channel`:** Salva o nome do canal em `~/.config/cosmic-twitch-chat/channel` para futuras execuções sem argumentos.
- **Arquivo pid:** Automaticamente escrito pelo app na inicialização e limpado no encerramento (handlers SIGTERM/SIGINT).

#### `ui/window.js` — ordem de inicialização & modo de teclado
- **Correção de ordem:** `_applyLayerShell()` agora executa **antes** de `_buildLayout()`, conforme exige a especificação do layer-shell.
- **Modo de teclado:** Adicionado `LayerShell.set_keyboard_mode(..., ON_DEMAND)` — com o modo padrão `NONE`, janelas overlay silenciosamente dropavam todos os eventos de teclado, quebrando atalhos como `Esc`, `Ctrl+B`, `Ctrl+Shift+C`.
- **Indicador visual:** Mostra `⚠ Overlay OFF` na barra de controle se a lib não for encontrada, com um tooltip explicando o que instalar.

#### Input de mouse e teclado
- **Click-through:** A janela usa `cairo.Region()` vazia para input, permitindo que todos os cliques do mouse passem para a janela por baixo (seu jogo).
- **Modo de teclado:** Definido como `KeyboardMode.NONE` — o overlay não pode receber input de teclado ou mouse por design (isso previne interferência com a gameplay).
- **Encerrando:** Use `gjs main.js --quit` (ou um atalho customizado do COSMIC) para terminar o app sem precisar de foco da janela.

### Diagnóstico

Se o modo overlay não estiver funcionando:

```bash
# Verifique se está em Wayland
echo $XDG_SESSION_TYPE

# Verifique se a lib está acessível
ls /usr/local/lib/x86_64-linux-gnu/libgtk4-layer-shell.so
ls /usr/lib/x86_64-linux-gnu/girepository-1.0/Gtk4LayerShell-1.0.typelib

# Execute com verbose logging
gjs main.js <canal> 2>&1 | grep -i layer
```
