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
      <!-- Microsoft Copilot Exact Imagine View from templates/imagine.html -->
      <div class="scrollbar-stable t-custom-scrollbar relative flex size-full flex-col items-center overflow-y-auto overflow-x-hidden overscroll-contain">
        <div class="w-full max-w-labs px-4 sm:px-6 pt-16 pb-28 flex flex-col items-center mx-auto">
          <!-- Page Header -->
          <div class="flex flex-col gap-2 text-center select-none mb-10">
            <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground-800 font-ginto">
              Inspire your next image
            </h1>
            <p class="text-sm sm:text-base text-foreground-600 max-w-xl mx-auto font-sans">
              Explore imaginative prompts and generative creations powered by Microsoft Copilot.
            </p>
          </div>

          <!-- 2x4 Gallery Grid (Responsive: 1 col mobile, 2 col tablet, 4 col desktop) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            ${this.items.map(
      (item) => html`
                <div
                  class="group relative break-inside-avoid flex flex-col overflow-hidden rounded-2xl bg-white/70 dark:bg-background-200/50 p-2 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer border border-black/5 dark:border-white/10 backdrop-blur-xl"
                  @click=${() => this.selectCard(item.prompt)}
                >
                  <!-- Card Image / Artwork with hover zoom and overlay -->
                  <div class="relative overflow-hidden rounded-xl aspect-4/5 w-full bg-black/10">
                    <img
                      src="${item.url}"
                      alt="${item.prompt}"
                      class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onerror="this.style.display='none'"
                    />
                    <!-- Hover gradient overlay with prompt text -->
                    <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-end p-3">
                      <span class="text-xs text-white line-clamp-3 leading-relaxed drop-shadow-sm font-sans">
                        ${item.prompt}
                      </span>
                    </div>
                  </div>

                  <!-- Card Footer: Tags + Like Counter -->
                  <div class="flex items-center justify-between p-2 pt-3 select-none">
                    <div class="flex items-center gap-1.5 flex-wrap min-w-0">
                      ${item.tags.map(
        (tag) => html`
                          <span
                            class="rounded-md bg-black/5 dark:bg-white/10 px-2 py-0.5 text-xs text-foreground-800 font-medium"
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
                      class="flex items-center gap-1 text-xs text-foreground-800/80 hover:text-foreground-900 transition-colors shrink-0"
                      @click=${(e: Event) => this.toggleLike(e, item.id)}
                    >
                      ${renderHeartIcon(item.isLiked, "size-3.5")}
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
