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
- `Q`: trocar entre as armas coletadas (espada, arco, lança, chakram, tocha, lâmina glacial, martelo, raio, tridente)

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

## Forja Vulcânica

Depois da queda da Rainha do Inverno, o portão leste se abre para a Forja Vulcânica.

- **Lava:** poças no chão ferem e lançam o herói para cima; plataformas de basalto desmoronam pouco depois de pisadas e voltam após alguns segundos.
- **Inimigos de magma** (imunes à tocha, fracos contra a Lâmina Glacial): Salamandras que investem pelo chão, Bombardeiros que lançam bolas de magma (que deixam poças) e Brasas aladas que mergulham no herói.
- **Martelo Vulcânico** (nova arma): arremesso em arco que causa tremor ao tocar o chão; é a única forma de quebrar a muralha de basalto. Especial: Terremoto de Magma.
- **Bigornas ancestrais:** acendem sozinhas e viram checkpoints.
- **Segredo:** com as Asas da Aurora, alcance a plataforma alta antes da arena para obter o Elmo de Obsidiana (a lava deixa de causar dano).
- **Chefe — Colosso da Forja:** armadura de magma reduz o dano (exceto do martelo). Após cada martelada o núcleo fica exposto: dano dobrado, triplo com a Lâmina Glacial. Na fase 2 a lava sobe periodicamente na arena: suba nas plataformas.

## Picos da Tempestade

Depois da queda do Colosso, a trilha sobe para os Picos da Tempestade.

- **Abismos de verdade:** o chão tem fendas; cair custa 1 de vida e devolve o herói ao último checkpoint.
- **Correntes de ar:** colunas de vento erguem o herói e o mantêm pairando no topo; uma delas é a única forma de cruzar o segundo abismo.
- **Rajadas de vento:** empurram o herói em direção aos abismos (segure `L` com escudo para resistir).
- **Raio** (nova arma): mira automaticamente no inimigo mais próximo à frente e se ramifica para até dois inimigos vizinhos. Especial: Tempestade Ramificada.
- **Para-raios:** acerte-os com o Raio. O primeiro acende por alguns segundos uma ponte de energia sobre o abismo mais largo.
- **Inimigos:** Harpias (mergulham e soltam penas), Sentinelas Rúnicas (raio horizontal após aviso: pule ou bloqueie com escudo) e Nuvens de Tempestade (lançam relâmpagos marcados no chão; só se dispersam com o Raio ou a Ruptura Astral).
- **Santuários do vento:** viram checkpoints ao passar.
- **Segredo:** pairando na corrente de ar antes do segundo abismo, só o pulo extra das Asas da Aurora alcança a Pena do Vendaval (imunidade às rajadas e +1 vida máxima).
- **Chefe — Dragão da Tempestade:** absorve o Raio. Carregue os **dois para-raios** da arena ao mesmo tempo para invocar o Raio Ancestral, que derruba o dragão e o deixa vulnerável (dano dobrado). Na fase 2 ganha um Escudo de Tempestade e só pode ser ferido depois de derrubado; as rajadas também chegam à arena.

No celular, os botões `⇄ ARMA`, `✧ ASTRAL` e `✦ VAZIO` ficam na barra inferior.

Para jogar localmente, abra `index.html` no navegador. Para a versão Godot, abra o projeto com Godot 4 e execute `main.tscn`.

## Ruínas Submersas (nova região)

Depois da queda do Dragão, a trilha desce até a Praia dos Náufragos e mergulha num templo afundado.

- **Natação**: debaixo d'água cada pulo é uma braçada; o herói afunda devagar e anda mais lento.
- **Ar**: o medidor esvazia debaixo d'água; sem ar o herói perde vida. Fontes de bolhas renovam o fôlego e viram checkpoint.
- **Correnteza**: um trecho empurra o herói para trás (segurar `L` com escudo ajuda).
- **Tridente**: nova arma que atravessa inimigos; especial *Maremoto*. A tocha se apaga na água.
- **Inimigos**: piranhas em cardume, águas-vivas com pulso elétrico e caranguejos com carapaça frontal (Tridente e Martelo passam).
- **Segredo**: uma concha gigante só abre com o Martelo e guarda a **Pérola do Abismo** (ar infinito e +1 vida máxima).
- **Chefe — Leviatã das Ruínas**: tentáculos (corte todos para atordoá-lo), jatos de tinta que escurecem a visão e um redemoinho que puxa o herói — com a boca aberta ele toma dano dobrado. Na fase 2 ganha escamas (só o Tridente fere de verdade) e chama um cardume.
