import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { renderHeartIcon } from "./icons";

export interface GalleryItem {
  id: string;
  url: string;
  thumbnailUrl: string;
  prompt: string;
  tags: string[];
  likedCount: number;
  isLiked?: boolean;
}

@customElement("copilot-imagine-view")
export class CopilotImagineView extends LitElement {
  @state() private items: GalleryItem[] = [
    {
      id: "gallery-1",
      url: "/static/cmc/images/gallery-1.jpg",
      thumbnailUrl: "/static/cmc/images/gallery-1-thumb.jpg",
      likedCount: 342,
      isLiked: false,
      prompt: "Ultra-detailed futuristic cyberpunk city with neon holograms and sunset reflections in rain puddles",
      tags: ["Cyberpunk", "City"],
    },
    {
      id: "gallery-2",
      url: "/static/cmc/images/gallery-2.jpg",
      thumbnailUrl: "/static/cmc/images/gallery-2-thumb.jpg",
      likedCount: 512,
      isLiked: true,
      prompt: "Magical ancient forest glowing with bioluminescent blue mushrooms and floating fairy lights, 8k octane render",
      tags: ["Nature", "Fantasy"],
    },
    {
      id: "gallery-3",
      url: "/static/cmc/images/gallery-3.jpg",
      thumbnailUrl: "/static/cmc/images/gallery-3-thumb.jpg",
      likedCount: 820,
      isLiked: false,
      prompt: "Stunning cosmic vista with a ringed purple exoplanet rising above a swirling golden stardust nebula",
      tags: ["Space", "Cosmos"],
    },
    {
      id: "gallery-4",
      url: "/static/cmc/images/gallery-4.jpg",
      thumbnailUrl: "/static/cmc/images/gallery-4-thumb.jpg",
      likedCount: 195,
      isLiked: false,
      prompt: "Sunlit architectural interior with terracotta arches, olive trees in ceramic pots, soft cinematic morning shadows",
      tags: ["Architecture", "Minimal"],
    },
    {
      id: "gallery-5",
      url: "/static/cmc/images/gallery-5.jpg",
      thumbnailUrl: "/static/cmc/images/gallery-5-thumb.jpg",
      likedCount: 640,
      isLiked: false,
      prompt: "Isometric 3D diorama of a cozy miniature loft bedroom with ultrawide monitors, cat sleeping, warm ambient lamp",
      tags: ["3D", "Isometric"],
    },
    {
      id: "gallery-6",
      url: "/static/cmc/images/gallery-6.jpg",
      thumbnailUrl: "/static/cmc/images/gallery-6-thumb.jpg",
      likedCount: 418,
      isLiked: true,
      prompt: "Delicate watercolor painting of blooming cherry blossoms blending into mist with gold foil texture splatters",
      tags: ["Watercolor", "Art"],
    },
    {
      id: "gallery-7",
      url: "/static/cmc/images/gallery-7.jpg",
      thumbnailUrl: "/static/cmc/images/gallery-7-thumb.jpg",
      likedCount: 275,
      isLiked: false,
      prompt: "Low poly geometric stained-glass hummingbird hovering mid-air, refracting vibrant spectral light beams",
      tags: ["Geometric", "Wildlife"],
    },
    {
      id: "gallery-8",
      url: "/static/cmc/images/gallery-8.jpg",
      thumbnailUrl: "/static/cmc/images/gallery-8-thumb.jpg",
      likedCount: 930,
      isLiked: true,
      prompt: "Retro 80s outrun vaporwave landscape with a retro sports car driving towards a giant digital wireframe sun",
      tags: ["Synthwave", "80s"],
    },
  ];

  protected override createRenderRoot() {
    return this;
  }

  private toggleLike(e: Event, id: string) {
    e.stopPropagation();
    this.items = this.items.map((item) => {
      if (item.id === id) {
        const isLiked = !item.isLiked;
        return {
          ...item,
          isLiked,
          likedCount: item.likedCount + (isLiked ? 1 : -1),
        };
      }
      return item;
    });
  }

  private selectCard(prompt: string) {
    this.dispatchEvent(
      new CustomEvent("submit-prompt", {
        detail: {
          prompt: `Create an image: ${prompt}`,
          model: "Smart",
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    return html`
      <div class="relative flex flex-col h-full w-full overflow-y-auto px-4 pt-14 pb-20">
        <div class="max-w-5xl mx-auto w-full flex flex-col gap-8">
          <!-- Page Header -->
          <div class="flex flex-col gap-2 text-center select-none">
            <h1 class="text-3xl md:text-4xl font-bold tracking-tight text-foreground-900 font-ginto">
              Inspire your next image
            </h1>
            <p class="text-sm md:text-base text-foreground-600 max-w-xl mx-auto font-sans">
              Explore imaginative prompts and generative creations powered by Microsoft Copilot.
            </p>
          </div>

          <!-- 2x4 Gallery Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${this.items.map(
      (item) => html`
                <div
                  class="copilot-card group relative flex flex-col overflow-hidden rounded-[22px] shadow-xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                  @click=${() => this.selectCard(item.prompt)}
                >
                  <!-- Card Image / Artwork -->
                  <div class="relative aspect-4/5 w-full overflow-hidden bg-black/20">
                    <img
                      src="${item.url}"
                      alt="${item.prompt}"
                      class="size-full object-cover transition-transform duration-500 group-hover:scale-108"
                      loading="lazy"
                      onerror="this.style.display='none'"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>

                    <!-- Prompt Preview on Hover -->
                    <div class="absolute inset-x-3 bottom-12 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <p class="text-xs text-white/95 line-clamp-3 leading-relaxed drop-shadow-md">
                        "${item.prompt}"
                      </p>
                    </div>
                  </div>

                  <!-- Card Footer (Tags + Like Counter) -->
                  <div class="p-3 flex items-center justify-between select-none">
                    <div class="flex items-center gap-1.5 flex-wrap min-w-0">
                      ${item.tags.map(
        (tag) => html`
                          <span
                            class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-foreground-800"
                          >
                            ${tag}
                          </span>
                        `
      )}
                    </div>

                    <!-- Like Button -->
                    <button
                      type="button"
                      aria-label="Like artwork"
                      class="flex items-center gap-1 text-xs text-foreground-700 hover:text-foreground-900 transition-colors shrink-0"
                      @click=${(e: Event) => this.toggleLike(e, item.id)}
                    >
                      ${renderHeartIcon(item.isLiked)}
                      <span class="font-medium">${item.likedCount}</span>
                    </button>
                  </div>
                </div>
              `
    )}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "copilot-imagine-view": CopilotImagineView;
  }
}
