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
- `Q`: trocar entre as armas coletadas (espada, arco, lança, chakram, tocha, lâmina glacial, martelo)

Derrote inimigos em sequência para ativar combos e aumentar a pontuação. O melhor resultado fica salvo localmente no navegador.

Explore os caminhos e encontre as cinco Memórias do Reino: elas aumentam sua vida máxima e carregam a Ressonância do Vazio (`K`), uma habilidade capaz de limpar projéteis e proteger o herói por alguns segundos.

Ao atravessar o Mar das Cinzas, prepare-se para o encontro opcional com o Guardião da Maré, uma arena especial com recompensa lendária.

Nas profundezas da caverna existe a Vigília dos Espinhos. Derrote seus três sentinelas para desbloquear a Ruptura Astral (`I`), um golpe de área com recarga que atravessa a defesa dos inimigos.

## Cidadela Gélida

Depois de derrotar o Senhor das Caveiras, o Portão Gélido se abre para a quinta região:

- **Inimigos novos:** Golem de Gelo (escudo frontal: ataque pelas costas ou use lança/tocha; pisões criam ondas de gelo que devem ser puladas), Mago Cultista (teleporta e dispara fragmentos que congelam o herói), Espíritos de Cristal (avisam e mergulham no herói).
- **Golem Ancestral (miniboss):** deixa as **Asas da Aurora** — pulo triplo e planar segurando o pulo.
- **Rainha do Inverno (chefe):** três fases — leque de fragmentos e estalactites; barreira mantida por dois Cristais de Âmago; Nevasca Eterna com ondas de gelo e espíritos.
- **Lâmina Glacial (nova arma):** congela inimigos. Acertar um inimigo congelado com a **tocha** causa *Choque Térmico* (dano triplo). Criaturas de gelo são imunes ao congelamento e fracas contra fogo.
- **Ambiente:** gelo escorregadio, estalactites que caem, nevascas que empurram o herói (segure `L` com escudo para resistir), muralha de gelo que derrete com a tocha ou com a Ruptura Astral, e uma emboscada na nevasca.
- **Missão secundária:** acenda os três braseiros com a tocha (cada um vira checkpoint) para ganhar o Coração da Chama (+1 vida máxima).
- **Segredo:** com as Asas da Aurora, alcance a plataforma alta além da muralha para obter o Amuleto Boreal (+1 de dano em todos os ataques).
- **Neve por altitude:** quanto mais alto o herói pisa na Cidadela, mais forte a nevasca; no chão ela volta ao nível normal.

## Forja Vulcânica (nova região)

Depois da queda da Rainha do Inverno, o portão leste se abre para a Forja Vulcânica.

- **Lava:** poças no chão ferem e lançam o herói para cima; plataformas de basalto desmoronam pouco depois de pisadas e voltam após alguns segundos.
- **Inimigos de magma** (imunes à tocha, fracos contra a Lâmina Glacial): Salamandras que investem pelo chão, Bombardeiros que lançam bolas de magma (que deixam poças) e Brasas aladas que mergulham no herói.
- **Martelo Vulcânico** (nova arma): arremesso em arco que causa tremor ao tocar o chão; é a única forma de quebrar a muralha de basalto. Especial: Terremoto de Magma.
- **Bigornas ancestrais:** acendem sozinhas e viram checkpoints.
- **Segredo:** com as Asas da Aurora, alcance a plataforma alta antes da arena para obter o Elmo de Obsidiana (a lava deixa de causar dano).
- **Chefe — Colosso da Forja:** armadura de magma reduz o dano (exceto do martelo). Após cada martelada o núcleo fica exposto: dano dobrado, triplo com a Lâmina Glacial. Na fase 2 a lava sobe periodicamente na arena: suba nas plataformas.

No celular, os botões `⇄ ARMA`, `✧ ASTRAL` e `✦ VAZIO` ficam na barra inferior.

Para jogar localmente, abra `index.html` no navegador. Para a versão Godot, abra o projeto com Godot 4 e execute `main.tscn`.
