const API_URL = "https://dummyjson.com/products";

const productList = document.querySelector("#product-list");
const loadStatus = document.querySelector("#load-status");
const currentYear = document.querySelector("#current-year");

currentYear.textContent = new Date().getFullYear();

/**
 * Crea una tarjeta usando nodos y textContent para evitar insertar HTML externo.
 */
function createProductCard(product) {
  const article = document.createElement("article");
  article.className = "product-card";

  if (product.thumbnail) {
    const imageWrapper = document.createElement("div");
    imageWrapper.className = "product-card__image-wrap";

    const image = document.createElement("img");
    image.className = "product-card__image";
    image.src = product.thumbnail;
    image.alt = product.title;
    image.loading = "lazy";
    image.width = 400;
    image.height = 300;

    imageWrapper.append(image);
    article.append(imageWrapper);
  }

  const body = document.createElement("div");
  body.className = "product-card__body";

  const title = document.createElement("h2");
  title.className = "product-card__title";
  title.textContent = product.title;

  const description = document.createElement("p");
  description.className = "product-card__description";
  description.textContent = product.description;

  const price = document.createElement("p");
  price.className = "product-card__price";
  price.textContent = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
  }).format(product.price);

  body.append(title, description, price);
  article.append(body);

  return article;
}

async function loadProducts() {
  loadStatus.classList.remove("status--error");
  loadStatus.textContent = "Cargando productos…";
  productList.setAttribute("aria-busy", "true");

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`La API respondió con el estado ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.products) || data.products.length === 0) {
      throw new Error("La API no devolvió productos");
    }

    const fragment = document.createDocumentFragment();
    data.products.forEach((product) => fragment.append(createProductCard(product)));
    productList.replaceChildren(fragment);
    loadStatus.textContent = `${data.products.length} productos disponibles`;
  } catch (error) {
    console.error("No fue posible cargar el catálogo:", error);
    productList.replaceChildren();
    loadStatus.classList.add("status--error");
    loadStatus.textContent = "No se pudo cargar el catálogo. Conéctate e inténtalo de nuevo.";
  } finally {
    productList.setAttribute("aria-busy", "false");
  }
}

async function initializeApp() {
  // El registro relativo mantiene el alcance correcto en localhost y GitHub Pages.
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./sw.js");
      // Así, incluso la primera consulta pasa por el Service Worker y queda cacheada.
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await Promise.race([
          new Promise((resolve) => {
            navigator.serviceWorker.addEventListener("controllerchange", resolve, {
              once: true,
            });
          }),
          // Evita bloquear la interfaz si un navegador tarda en asignar el control.
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      }
    } catch (error) {
      console.error("No fue posible registrar el Service Worker:", error);
    }
  }

  await loadProducts();
}

initializeApp();
