# Vida de Herói

Protótipo de plataforma 2D que roda diretamente no navegador pelo `index.html` e também possui uma versão de protótipo em Godot 4.

## Publicar no GitHub Pages

No GitHub, abra **Settings > Pages**, escolha a branch `main` e a pasta `/ (root)`. O arquivo `index.html` será publicado automaticamente.

## Conceito

Um herói atravessa ruínas, alternando entre espada, arco e escudo. Runas espalhadas recuperam sua armadura em três estágios visuais, inspirados na progressão clássica de *Ghosts ’n Goblins*.

## Controles

- `A/D` ou setas: mover
- `Espaço`: pular
- `J`: atacar com a arma equipada
- `K`: disparar quando o arco estiver equipado
- `L`: bloquear com o escudo
- `Q`: trocar entre espada, arco e escudo

Derrote inimigos em sequência para ativar combos e aumentar a pontuação. O melhor resultado fica salvo localmente no navegador.

Explore os caminhos e encontre as cinco Memórias do Reino: elas aumentam sua vida máxima e carregam a Ressonância do Vazio (`K`), uma habilidade capaz de limpar projéteis e proteger o herói por alguns segundos.

Ao atravessar o Mar das Cinzas, prepare-se para o encontro opcional com o Guardião da Maré, uma arena especial com recompensa lendária.

Nas profundezas da caverna existe a Vigília dos Espinhos. Derrote seus três sentinelas para desbloquear a Ruptura Astral (`I`), um golpe de área com recarga que atravessa a defesa dos inimigos.

Para jogar localmente, abra `index.html` no navegador. Para a versão Godot, abra o projeto com Godot 4 e execute `main.tscn`.
