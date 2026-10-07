import { html } from "lit";

export function renderOmpLogo(className = "size-6 shrink-0") {
  return html`
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="${className}">
      <defs>
        <linearGradient id="omp-logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ed4abf" />
          <stop offset="50%" stop-color="#9b4dff" />
          <stop offset="100%" stop-color="#5ad8e6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0f0a14" />
      <path fill="url(#omp-logo-gradient)" d="M14 16h36v8H40v32h-8V24h-6v22h-8V24h-4z" />
    </svg>
  `;
}

export function renderToggleSidebarIcon(className = "size-5") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M3.75 8.5C3.75 8.08579 4.08579 7.75 4.5 7.75H5.75C6.16421 7.75 6.5 8.08579 6.5 8.5C6.5 8.91421 6.16421 9.25 5.75 9.25H4.5C4.08579 9.25 3.75 8.91421 3.75 8.5ZM3.75 12C3.75 11.5858 4.08579 11.25 4.5 11.25H5.75C6.16421 11.25 6.5 11.5858 6.5 12C6.5 12.4142 6.16421 12.75 5.75 12.75H4.5C4.08579 12.75 3.75 12.4142 3.75 12ZM3.75 15.5C3.75 15.0858 4.08579 14.75 4.5 14.75H5.75C6.16421 14.75 6.5 15.0858 6.5 15.5C6.5 15.9142 6.16421 16.25 5.75 16.25H4.5C4.08579 16.25 3.75 15.9142 3.75 15.5ZM4.25 3C2.45507 3 1 4.45507 1 6.25V17.75C1 19.5449 2.45508 21 4.25 21H19.75C21.5449 21 23 19.5449 23 17.75V6.25C23 4.45507 21.5449 3 19.75 3H4.25ZM19.75 19.5H9V4.5H19.75C20.7165 4.5 21.5 5.2835 21.5 6.25V17.75C21.5 18.7165 20.7165 19.5 19.75 19.5ZM4.25 4.5H7.5V19.5H4.25C3.2835 19.5 2.5 18.7165 2.5 17.75V6.25C2.5 5.2835 3.2835 4.5 4.25 4.5Z"></path>
    </svg>
  `;
}

export function renderNewChatIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M21.7803 3.28033C22.0732 2.98744 22.0732 2.51256 21.7803 2.21967C21.4874 1.92678 21.0125 1.92678 20.7196 2.21967L10.7197 12.2197L10.25 13.75L11.7803 13.2803L21.7803 3.28033ZM6.25 3C4.45507 3 3 4.45508 3 6.25V17.75C3 19.5449 4.45507 21 6.25 21H17.75C19.5449 21 21 19.5449 21 17.75V9.75C21 9.33579 20.6642 9 20.25 9C19.8358 9 19.5 9.33579 19.5 9.75V17.75C19.5 18.7165 18.7165 19.5 17.75 19.5H6.25C5.2835 19.5 4.5 18.7165 4.5 17.75V6.25C4.5 5.2835 5.2835 4.5 6.25 4.5H14.25C14.6642 4.5 15 4.16421 15 3.75C15 3.33579 14.6642 3 14.25 3H6.25Z"></path>
    </svg>
  `;
}

export function renderLibraryIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M11.0656 8.00389L11.25 7.99875H18.75C20.483 7.99875 21.8992 9.3552 21.9949 11.0643L22 11.2487V18.7487C22 20.4818 20.6435 21.898 18.9344 21.9936L18.75 21.9987H11.25C9.51697 21.9987 8.10075 20.6423 8.00515 18.9332L8 18.7487V11.2487C8 9.51571 9.35646 8.0995 11.0656 8.00389ZM18.75 9.49875H11.25C10.3318 9.49875 9.57881 10.2059 9.5058 11.1052L9.5 11.2487V18.7487C9.5 19.6669 10.2071 20.4199 11.1065 20.4929L11.25 20.4987H18.75C19.6682 20.4987 20.4212 19.7916 20.4942 18.8923L20.5 18.7487V11.2487C20.5 10.2822 19.7165 9.49875 18.75 9.49875ZM15.5818 4.23284L15.6345 4.40964L16.327 6.998H14.774L14.1856 4.79787C13.9355 3.86431 12.9759 3.31029 12.0423 3.56044L4.79787 5.50158C3.91344 5.73857 3.38555 6.65089 3.62254 7.53532L5.56368 14.7797C5.80067 15.6642 6.71299 16.192 7.59742 15.9551L9.208 15.523V17.076L7.20846 17.6118C5.43961 18.0857 3.61497 17.03 3.14101 15.2612L1.19987 8.01676C0.725899 6.2479 1.78167 4.42326 3.55053 3.9493L10.795 2.00816C12.6622 1.50785 14.5813 2.61589 15.0817 4.48301L15.5818 4.23284Z"></path>
    </svg>
  `;
}

export function renderTasksIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M19.75 3C20.9926 3 22 4.00736 22 5.25V18.75C22 19.9926 20.9926 21 19.75 21H4.25C3.00736 21 2 19.9926 2 18.75V5.25C2 4.00736 3.00736 3 4.25 3H19.75ZM19.75 4.5H4.25C3.83579 4.5 3.5 4.83579 3.5 5.25V18.75C3.5 19.1642 3.83579 19.5 4.25 19.5H19.75C20.1642 19.5 20.5 19.1642 20.5 18.75V5.25C20.5 4.83579 20.1642 4.5 19.75 4.5ZM16.0303 8.46967C16.3232 8.76256 16.3232 9.23744 16.0303 9.53033L10.5303 15.0303C10.2374 15.3232 9.76256 15.3232 9.46967 15.0303L7.46967 13.0303C7.17678 12.7374 7.17678 12.2626 7.46967 11.9697C7.76256 11.6768 8.23744 11.6768 8.53033 11.9697L10 13.4393L14.9697 8.46967C15.2626 8.17678 15.7374 8.17678 16.0303 8.46967Z"></path>
    </svg>
  `;
}

export function renderDiscoverIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M3.5 12C3.5 7.30558 7.30558 3.5 12 3.5C16.6944 3.5 20.5 7.30558 20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C7.30558 20.5 3.5 16.6944 3.5 12ZM12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM7.08349 8.70767C6.67722 7.6882 7.68791 6.67747 8.7074 7.08372L12.7356 8.68888C13.9078 9.15602 14.8461 10.0704 15.3431 11.2303L17.1969 15.5557C17.6414 16.5929 16.5927 17.6415 15.5555 17.197L11.2301 15.3433C10.0703 14.8462 9.15587 13.908 8.68872 12.7358L7.08349 8.70767ZM8.69209 8.69233L10.0822 12.1805C10.4018 12.9825 11.0274 13.6245 11.821 13.9646L15.572 15.5721L13.9644 11.8212C13.6243 11.0276 12.9824 10.4019 12.1803 10.0823L8.69209 8.69233Z"></path>
    </svg>
  `;
}

export function renderShoppingIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zm0 2h12l2 2.67V20H4V6.67L6 4zm5 5a3 3 0 0 0-3 3h2a1 1 0 0 1 2 0 1 1 0 0 1 2 0h2a3 3 0 0 0-3-3z"></path>
    </svg>
  `;
}

export function renderImagineIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-1.96-2.36L6.5 17h11l-3.54-4.71z"></path>
    </svg>
  `;
}

export function renderLabsIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M2 5.25C2 3.45507 3.45507 2 5.25 2H14.75C16.5449 2 18 3.45507 18 5.25V8H16.5V5.25C16.5 4.2835 15.7165 3.5 14.75 3.5H5.25C4.2835 3.5 3.5 4.2835 3.5 5.25V12.75C3.5 13.7165 4.2835 14.5 5.25 14.5H8V16H5.25C3.45507 16 2 14.5449 2 12.75V5.25ZM19 13.25C19 13.9404 18.4404 14.5 17.75 14.5C17.0596 14.5 16.5 13.9404 16.5 13.25C16.5 12.5596 17.0596 12 17.75 12C18.4404 12 19 12.5596 19 13.25ZM9 12.25C9 10.4551 10.4551 9 12.25 9H18.75C20.5449 9 22 10.4551 22 12.25V18.75C22 20.5449 20.5449 22 18.75 22H12.25C10.4551 22 9 20.5449 9 18.75V12.25ZM12.25 10.5C11.2835 10.5 10.5 11.2835 10.5 12.25V18.75C10.5 18.9393 10.5301 19.1216 10.5856 19.2923L13.98 16.1069C14.845 15.2977 16.155 15.2977 17.02 16.1069L20.4144 19.2923C20.4699 19.1216 20.5 18.9393 20.5 18.75V12.25C20.5 11.2835 19.7165 10.5 18.75 10.5H12.25Z"></path>
    </svg>
  `;
}

export function renderPlusIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="${className}">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  `;
}

export function renderFolderIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M2.25 6.75C2.25 5.50736 3.25736 4.5 4.5 4.5H8.62132C9.21808 4.5 9.7904 4.73705 10.2123 5.15899L11.5537 6.50041C11.9756 6.92235 12.5479 7.1594 13.1447 7.1594H19.5C20.7426 7.1594 21.75 8.16676 21.75 9.4094V17.25C21.75 18.4926 20.7426 19.5 19.5 19.5H4.5C3.25736 19.5 2.25 18.4926 2.25 17.25V6.75Z" />
    </svg>
  `;
}

export function renderPhotoIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
      <circle cx="9" cy="9" r="2"/>
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
    </svg>
  `;
}

export function renderChatBubbleIcon(className = "size-4 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="${className}">
      <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  `;
}

export function renderWaveformIcon(className = "size-5") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <rect x="4" y="9" width="2.2" height="6" rx="1.1"></rect>
      <rect x="9" y="5" width="2.2" height="14" rx="1.1"></rect>
      <rect x="14" y="7" width="2.2" height="10" rx="1.1"></rect>
      <rect x="19" y="10" width="2.2" height="4" rx="1.1"></rect>
    </svg>
  `;
}

export function renderSendIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="${className}">
      <line x1="12" y1="19" x2="12" y2="5"></line>
      <polyline points="5 12 12 5 19 12"></polyline>
    </svg>
  `;
}

export function renderStopIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <rect x="6.5" y="6.5" width="11" height="11" rx="2.5"></rect>
    </svg>
  `;
}

export function renderQueueIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M4 6h11"></path>
      <path d="M4 12h7"></path>
      <path d="M4 18h7"></path>
      <path d="m15 14 5 3-5 3z" fill="currentColor"></path>
    </svg>
  `;
}

export function renderArrowLeftIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  `;
}

export function renderChevronDownIcon(className = "size-3") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="${className}">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `;
}

export function renderUserIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="${className}">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  `;
}

export function renderHeartIcon(filled = false, className = "size-4") {
  return filled
    ? html`
        <svg viewBox="0 0 24 24" fill="#FF5252" class="${className}">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
        </svg>
      `
    : html`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="${className}">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      `;
}

export function renderShareIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="${className}">
      <circle cx="18" cy="5" r="3"></circle>
      <circle cx="6" cy="12" r="3"></circle>
      <circle cx="18" cy="19" r="3"></circle>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
    </svg>
  `;
}

export function renderSunIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="${className}">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
  `;
}

export function renderMoonIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="${className}">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  `;
}

export function renderLoadingDots() {
  return html`
    <div class="inline-flex items-center gap-1.5 py-1">
      <span class="size-2 rounded-full bg-[#8C48FF] animate-pulse motion-reduce:animate-none" style="animation-delay: 0ms"></span>
      <span class="size-2 rounded-full bg-[#00AEFF] animate-pulse motion-reduce:animate-none" style="animation-delay: 150ms"></span>
      <span class="size-2 rounded-full bg-[#FF5F3D] animate-pulse motion-reduce:animate-none" style="animation-delay: 300ms"></span>
    </div>
  `;
}


export function renderSmartModeIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  `;
}

export function renderQuickModeIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  `;
}

export function renderThinkModeIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z"/>
    </svg>
  `;
}

export function renderDotMatrixIcon(className = "size-4 shrink-0", isAnimated = false) {
  return html`
    <svg class="${className} ${isAnimated ? "animate-pulse" : ""}" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="3" cy="3" r="1.3" opacity="${isAnimated ? "0.9" : "0.75"}" />
      <circle cx="8" cy="3" r="1.3" opacity="${isAnimated ? "0.4" : "0.9"}" />
      <circle cx="13" cy="3" r="1.3" opacity="${isAnimated ? "0.8" : "0.55"}" />
      <circle cx="3" cy="8" r="1.3" opacity="${isAnimated ? "0.5" : "0.85"}" />
      <circle cx="8" cy="8" r="1.3" opacity="${isAnimated ? "0.9" : "0.6"}" />
      <circle cx="13" cy="8" r="1.3" opacity="${isAnimated ? "0.3" : "0.8"}" />
      <circle cx="3" cy="13" r="1.3" opacity="${isAnimated ? "0.8" : "0.6"}" />
      <circle cx="8" cy="13" r="1.3" opacity="${isAnimated ? "0.6" : "0.8"}" />
      <circle cx="13" cy="13" r="1.3" opacity="${isAnimated ? "1.0" : "1.0"}" />
    </svg>
  `;
}

export function renderPaperclipIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l7.9-7.9"/>
    </svg>
  `;
}

export function renderScreenshotIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0-5 5M4 16v4m0 0h4m-4 0 5-5m11 5v-4m0 4h-4m4 0-5-5"/>
    </svg>
  `;
}

export function renderOneDriveIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
    </svg>
  `;
}

export function renderGoogleDriveIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M4.5 16.5 9 8.7h6l-4.5 7.8H4.5Z"/>
      <path d="M15 8.7 19.5 16.5h-9l4.5-7.8Z"/>
      <path d="M15 8.7 10.5 1H6l4.5 7.7h4.5Z"/>
    </svg>
  `;
}

export function renderSparklesIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/>
    </svg>
  `;
}

export function renderWebPageIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  `;
}

export function renderCheckIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  `;
}

export function renderCloseIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
}

export function renderLockIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  `;
}



export function renderEyeIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  `;
}

export function renderEyeOffIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  `;
}

export function renderDotsHorizontalIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  `;
}

export function renderTrashIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  `;
}

export function renderBranchIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <line x1="6" y1="3" x2="6" y2="15"></line>
      <circle cx="18" cy="6" r="3"></circle>
      <circle cx="6" cy="18" r="3"></circle>
      <path d="M18 9a9 9 0 0 1-9 9"></path>
    </svg>
  `;
}

export function renderProjectsIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M12.378 1.602a.75.75 0 00-.756 0L3.122 6.602A.75.75 0 002.75 7.25v9.5c0 .27.144.518.372.648l8.5 5a.75.75 0 00.756 0l8.5-5a.75.75 0 00.372-.648V7.25a.75.75 0 00-.372-.648l-8.5-5zM12 3.14l7.086 4.168L12 11.476 4.914 7.308 12 3.14zM4.25 8.784l7 4.118v7.958l-7-4.118V8.784zm8.5 12.076v-7.958l7-4.118v7.958l-7 4.118z"/>
    </svg>
  `;
}

export function renderLightbulbIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
      <path d="M9 18h6"/>
      <path d="M10 22h4"/>
    </svg>
  `;
}

export function renderSettingsIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  `;
}

export function renderPluginsIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>
  `;
}

export function renderPackageIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
    </svg>
  `;
}

export function renderKeyboardIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <rect width="20" height="16" x="2" y="4" rx="2"/>
      <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M6 12h.001M18 12h.001M8 16h8"/>
    </svg>
  `;
}

export function renderRefreshIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>
    </svg>
  `;
}

export function renderServerIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2"/>
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2"/>
      <line x1="6" x2="6.01" y1="6" y2="6"/>
      <line x1="6" x2="6.01" y1="18" y2="18"/>
    </svg>
  `;
}

export function renderChevronUpIcon(className = "size-4 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="${className}">
      <polyline points="18 15 12 9 6 15"></polyline>
    </svg>
  `;
}

export function renderAnthropicIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M13.8 3L22 21h-4.3l-1.8-4.2H8.1L6.3 21H2L10.2 3h3.6zm-1.8 5.4L9.6 13.8h4.8L12 8.4z"/>
    </svg>
  `;
}

export function renderOpenAIIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M22.28 9.5a5.52 5.52 0 0 0-.49-4.66 5.58 5.58 0 0 0-4.08-2.6 5.68 5.68 0 0 0-4.73 1.15 5.58 5.58 0 0 0-3.95-1.74A5.63 5.63 0 0 0 4 3.7a5.56 5.56 0 0 0-2.28 4.41 5.6 5.6 0 0 0 .5 4.67 5.58 5.58 0 0 0 4.08 2.6 5.68 5.68 0 0 0 4.73-1.15 5.58 5.58 0 0 0 3.95 1.74 5.63 5.63 0 0 0 5.08-2.05 5.56 5.56 0 0 0 2.22-4.42zm-8.8 9.85a4.1 4.1 0 0 1-2.45-.8l1.32-2.29a2.6 2.6 0 0 0 2.7.2 2.65 2.65 0 0 0 1.34-2.31v-2.9l2.25 1.3v3.74a4.1 4.1 0 0 1-5.16 3.06zm-7.6-4.4a4.1 4.1 0 0 1-.53-2.54l2.64.03a2.6 2.6 0 0 0 1.55 2.22 2.65 2.65 0 0 0 2.67-.03l2.5-1.46v2.6l-3.23 1.87a4.1 4.1 0 0 1-5.6-2.69zm-.94-7.46a4.1 4.1 0 0 1 1.93-1.74l1.32 2.3a2.6 2.6 0 0 0-1.15 2.45 2.65 2.65 0 0 0 1.33 2.32l2.52 1.45-1.3 2.26-3.24-1.87a4.1 4.1 0 0 1-1.41-7.17zm11.2 2.32l-2.52-1.45 1.3-2.26 3.24 1.87a4.1 4.1 0 0 1 1.41 7.17 4.1 4.1 0 0 1-1.93 1.74l-1.32-2.3a2.6 2.6 0 0 0 1.15-2.45 2.65 2.65 0 0 0-1.33-2.32zm2.08-3.03a4.1 4.1 0 0 1 .53 2.54l-2.64-.03a2.6 2.6 0 0 0-1.55-2.22 2.65 2.65 0 0 0-2.67.03l-2.5 1.46V5.9l3.23-1.87a4.1 4.1 0 0 1 5.6 2.75zM12 13.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
    </svg>
  `;
}

export function renderGoogleGeminiIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z"/>
    </svg>
  `;
}

export function renderDeepSeekIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M19 12c-1.5 0-3-1-4-2.5-1.5-2.2-3.8-3.5-6.5-3.5C4.9 6 2 8.9 2 12.5S4.9 19 8.5 19c3.2 0 6-2 7.2-5h3.3c-.6 1.8-1.8 3.3-3.4 4.3 1.2.5 2.5.7 3.9.7 2.5 0 4.5-1.5 5.5-3.5-1.3-.3-3.2-.5-6-3.5z"/>
    </svg>
  `;
}

export function renderOllamaIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M8 3v4M16 3v4M7 7h10a4 4 0 0 1 4 4v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7a4 4 0 0 1 4-4z"/>
      <circle cx="9" cy="13" r="1" fill="currentColor"/>
      <circle cx="15" cy="13" r="1" fill="currentColor"/>
    </svg>
  `;
}

export function renderGroqIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  `;
}

export function renderCopilotIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  `;
}

export function renderMistralIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M3 4h4v4H3V4zm7 0h4v4h-4V4zm7 0h4v4h-4V4zM3 11h4v4H3v-4zm7 0h4v4h-4v-4zm7 0h4v4h-4v-4zM3 18h4v4H3v-4zm7 0h4v4h-4v-4zm7 0h4v4h-4v-4z"/>
    </svg>
  `;
}

export function renderFeatherIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
      <line x1="16" y1="8" x2="2" y2="22"/>
      <line x1="17.5" y1="15" x2="9" y2="15"/>
    </svg>
  `;
}

export function renderBoltIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  `;
}

export function renderBrainIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z"/>
    </svg>
  `;
}

export function renderModelsIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  `;
}


export function renderMetaIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M12 16.5c-2.4 0-4.3-1.6-5.4-3.6C5.5 11 4.5 9.7 3.4 9.7c-1.3 0-2.4 1.4-2.4 3.5 0 2.8 1.8 5.3 4.2 5.3 1.8 0 3.2-1 4.5-2.7 1.2 1.7 2.7 2.7 4.5 2.7 2.4 0 4.2-2.5 4.2-5.3 0-2.1-1.1-3.5-2.4-3.5-1.1 0-2.1 1.3-3.2 3.2-1.1 2-3 3.6-5.4 3.6h2.6z"/>
    </svg>
  `;
}

export function renderXAiIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  `;
}

export function renderAwsIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M18.5 14.5c-3.5 2.5-8.5 3.8-13 1.8-.6-.3-1.3.3-.8.8 4.2 3.8 10.5 4.2 15.2 1 .7-.5.2-1.5-.7-1.1M19.7 16.7c.4-.5.8-1.3.8-2 0-.2-.2-.4-.4-.3-.7.3-1.6.6-2.5.6-.2 0-.3.2-.2.4.4.6 1.4 1.2 2.3 1.3"/>
    </svg>
  `;
}

export function renderAzureIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M13.05 2.25l-6.8 11.75h5.5l-4.5 7.75 14.5-13h-6.2z"/>
    </svg>
  `;
}

export function renderCloudflareIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
    </svg>
  `;
}

export function renderOpenRouterIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  `;
}

export function renderAppleIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.85.94-2.93-.93.04-2.02.63-2.67 1.4-.57.65-1.08 1.75-.95 2.8 1.04.08 2.05-.5 2.68-1.27z"/>
    </svg>
  `;
}

export function renderNvidiaIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c-3 0-5.5-2.5-5.5-5.5S10 5.5 13 5.5c2 0 3.7 1.1 4.6 2.7l-2.1 1.2c-.6-1-1.5-1.6-2.5-1.6-1.8 0-3.2 1.4-3.2 3.2s1.4 3.2 3.2 3.2c1.2 0 2.2-.6 2.7-1.5H13v-2.3h5.2c.1.4.1.8.1 1.2 0 3-2.4 4.9-5.3 4.9z"/>
    </svg>
  `;
}

export function renderMoonshotIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z"/>
    </svg>
  `;
}

export function renderCerebrasIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <rect x="9" y="9" width="6" height="6"/>
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>
    </svg>
  `;
}

export function renderCohereIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="M17.5 3A6.5 6.5 0 0 0 11 9.5c0 1.2.3 2.3.9 3.3L3.5 21.2a1 1 0 0 0 1.4 1.4l8.4-8.4c1 .6 2.1.9 3.3.9A6.5 6.5 0 0 0 23 8.6 6.5 6.5 0 0 0 17.5 3z"/>
    </svg>
  `;
}

export function renderTogetherIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <circle cx="6" cy="6" r="3"/>
      <circle cx="18" cy="6" r="3"/>
      <circle cx="12" cy="18" r="3"/>
      <path d="M6 9v2c0 2 2 4 4 4h4c2 0 4-2 4-4V9" fill="none" stroke="currentColor" stroke-width="2"/>
    </svg>
  `;
}

export function renderGitLabIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path d="m23.6 9.6-1.5-4.7c-.2-.5-.8-.8-1.3-.5-.3.1-.5.4-.6.7l-2.4 7.3H6.2L3.8 5.1c-.2-.5-.8-.8-1.3-.5-.3.1-.5.4-.6.7L.4 9.6c-.2.5 0 1.1.4 1.4L12 19.8l11.2-8.8c.4-.3.6-.9.4-1.4z"/>
    </svg>
  `;
}

export function renderPerplexityIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <line x1="12" y1="2" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/>
    </svg>
  `;
}

export function renderChipIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v3M12 20v3M20 12h3M1 12h3"/>
    </svg>
  `;
}

export function renderModelProviderIcon(provider?: string, className = "size-4") {
  const p = (provider || "").toLowerCase();
  if (p.includes("anthropic") || p.includes("claude")) return renderAnthropicIcon(className);
  if (p.includes("openai") || p.includes("gpt") || p.includes("codex") || p.includes("chatgpt")) return renderOpenAIIcon(className);
  if (p.includes("google") || p.includes("gemini") || p.includes("antigravity")) return renderGoogleGeminiIcon(className);
  if (p.includes("deepseek")) return renderDeepSeekIcon(className);
  if (p.includes("ollama")) return renderOllamaIcon(className);
  if (p.includes("groq")) return renderGroqIcon(className);
  if (p.includes("mistral") || p.includes("codestral")) return renderMistralIcon(className);
  if (p.includes("meta") || p.includes("llama")) return renderMetaIcon(className);
  if (p.includes("xai") || p.includes("grok")) return renderXAiIcon(className);
  if (p.includes("copilot") || p.includes("github")) return renderCopilotIcon(className);
  if (p.includes("gitlab")) return renderGitLabIcon(className);
  if (p.includes("amazon") || p.includes("bedrock") || p.includes("aws")) return renderAwsIcon(className);
  if (p.includes("azure")) return renderAzureIcon(className);
  if (p.includes("cloudflare")) return renderCloudflareIcon(className);
  if (p.includes("openrouter")) return renderOpenRouterIcon(className);
  if (p.includes("apple")) return renderAppleIcon(className);
  if (p.includes("nvidia")) return renderNvidiaIcon(className);
  if (p.includes("moonshot") || p.includes("kimi")) return renderMoonshotIcon(className);
  if (p.includes("cerebras")) return renderCerebrasIcon(className);
  if (p.includes("cohere")) return renderCohereIcon(className);
  if (p.includes("together")) return renderTogetherIcon(className);
  if (p.includes("perplexity")) return renderPerplexityIcon(className);
  if (p.includes("local") || p.includes("vllm") || p.includes("lm-studio")) return renderChipIcon(className);
  return renderSparklesIcon(className);
}

export function renderDocumentIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  `;
}

export function renderCopyIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  `;
}

export function renderPaletteIcon(className = "size-4") {
  return html`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"></path>
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
    </svg>
  `;
}

export function renderTerminalIcon(className = "size-4") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <polyline points="4 17 10 11 4 5"></polyline>
      <line x1="12" y1="19" x2="20" y2="19"></line>
    </svg>
  `;
}

export function renderUsageIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <path d="M12 20v-6M6 20V10M18 20V4"/>
    </svg>
  `;
}

export function renderScheduleIcon(className = "size-5 shrink-0") {
  return html`
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 7 12 12 15 15"/>
    </svg>
  `;
}
