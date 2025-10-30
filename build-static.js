// build-static.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');

const app = express();

// ---- EJS Setup ----
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---- Static Assets ----
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------------
// 1. Helper: format product name (same as your index.js)
const formatProductName = (key) => {
    if (key.includes(' ')) return key;
    let name = key;
    name = name.replace(/^iPhone(\d+)/, 'iPhone $1');
    name = name.replace(/(\d+)ProMax$/, '$1 Pro Max');
    name = name.replace(/(\d+)Pro$/, '$1 Pro');
    name = name.replace(/(\d+)Plus$/, '$1 Plus');
    return name;
};

// 2. Helper: resolve image paths
const resolveStaticPath = (p) => {
    if (!p) return null;
    if (/^https?:\/\//i.test(p)) return p;
    if (p.startsWith('/')) return p;
    return '/' + p.replace(/^(\.\/|(\.\.\/)+)/, '');
};

// ------------------------------------------------------------------
// 3. Routes (only GET – static rendering)

app.get('/', (req, res) => res.render('index', { user: null }));

app.get('/Login', (req, res) => res.render('Login'));
app.get('/Signup', (req, res) => res.render('Signup'));
app.get('/Accessories', (req, res) => res.render('Accessories'));
app.get('/support', (req, res) => res.render('support'));
app.get('/DeliveryAddress', (req, res) => res.render('DeliveriAddressPage'));
app.get('/Cart', (req, res) => res.render('Cart'));

// ---- All Products Page ----
app.get('/All_Products', (req, res) => {
    const file = path.join(__dirname, 'public', 'Data', 'All_Products.json');
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);

    const products = Object.keys(data).map((key, idx) => {
        const p = data[key];
        let display = '';
        if (p.display) {
            if (typeof p.display === 'string') display = p.display;
            else if (p.display.size && p.display.type) display = `${p.display.size} ${p.display.type}`;
            else if (p.display.size) display = p.display.size;
            else if (p.display.type) display = p.display.type;
        }
        let chip = p.chip?.model || p.chip || '';

        return {
            id: idx + 1,
            productKey: key,
            name: formatProductName(key),
            price: p.price,
            display,
            chip,
            description: p.description || '',
            camera: p.camera,
            colors: p.colors,
            storage_options: p.storage_options,
            ProductThumbnail: resolveStaticPath(p.ProductThumbnail) || null,
            badge: idx === 0 ? 'New' : null
        };
    });

    res.render('All_Products', { products });
});

// ---- Product Detail Page ----
app.get('/product/:productKey', (req, res) => {
    const key = req.params.productKey;
    const file = path.join(__dirname, 'public', 'Data', 'All_Products.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const p = data[key];

    if (!p) return res.status(404).send('Product not found');

    const product = {
        product: formatProductName(key),
        description: p.description || '',
        price_starting: p.price,
        image: resolveStaticPath(p.image),
        ProductImage: resolveStaticPath(p.ProductImage) || resolveStaticPath(p.image),
        chip: p.chip ? { model: p.chip.model || p.chip } : null,
        ram: p.ram || '8GB',
        storage_options: p.storage_options || [],
        battery: p.battery,
        camera: p.camera,
        display: p.display,
        operating_system: p.operating_system,
        connectivity: p.connectivity,
        build: p.build,
        key_features: p.key_features || [],
        audio: p.audio || null
    };

    res.render('ProductPage', { product });
});

// ---- All Accessories Page ----
app.get('/All_Accessories', (req, res) => {
    const file = path.join(__dirname, 'public', 'Data', 'All Accessories.json');
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    res.render('All_Accessories', { accessories: data });
});

// ---- Accessory Detail Page ----
app.get('/accessory/:accessoryKey', (req, res) => {
    const key = req.params.accessoryKey;
    const file = path.join(__dirname, 'public', 'Data', 'All Accessories.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const found = data.find(a => a.product === key) || {};

    const parsePrice = (val) => {
        if (typeof val === 'number') return val;
        const num = String(val).replace(/[^0-9]/g, '');
        return num ? parseInt(num, 10) : 0;
    };

    const product = {
        product: found.product || 'Accessory',
        description: found.description || '',
        price_starting: found.price || '',
        price_number: parsePrice(found.price),
        image: resolveStaticPath(found.image),
        ProductImage: resolveStaticPath(found.ProductImage) || resolveStaticPath(found.image),
        key_features: found.key_features || null,
        technical_specifications: found.technical_specifications || null,
        compatibility: found.compatibility || null,
        features: found.features || null
    };

    res.render('AccessoryPage', { product });
});

// ------------------------------------------------------------------
// 4. Start server (port 0 = random)
const server = app.listen(0);
const base = `http://localhost:${server.address().port}`;

// ------------------------------------------------------------------
// 5. Pages to pre-render
const pages = [
    { url: '/', file: 'index.html' },
    { url: '/Login', file: 'login.html' },
    { url: '/Signup', file: 'signup.html' },
    { url: '/Accessories', file: 'accessories.html' },
    { url: '/support', file: 'support.html' },
    { url: '/DeliveryAddress', file: 'deliveryaddress.html' },
    { url: '/Cart', file: 'cart.html' },
    { url: '/All_Products', file: 'all_products.html' },
    { url: '/All_Accessories', file: 'all_accessories.html' }
];

// Add dynamic product pages
const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'Data', 'All_Products.json'), 'utf8'));
Object.keys(products).forEach(key => {
    const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    pages.push({ url: `/product/${key}`, file: `product/${slug}.html` });
});

// Add dynamic accessory pages
const accessories = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'Data', 'All Accessories.json'), 'utf8'));
accessories.forEach(item => {
    const key = item.product;
    const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    pages.push({ url: `/accessory/${encodeURIComponent(key)}`, file: `accessory/${slug}.html` });
});

// ------------------------------------------------------------------
// 6. Render & Save
async function render(p) {
    return new Promise((resolve, reject) => {
        http.get(`${base}${p.url}`, res => {
            let html = '';
            res.on('data', d => html += d);
            res.on('end', () => {
                const out = path.join(__dirname, 'public', p.file);
                fs.mkdirSync(path.dirname(out), { recursive: true });
                fs.writeFileSync(out, html);
                console.log(`${p.url} → ${p.file}`);
                resolve();
            });
        }).on('error', reject);
    });
}

// ------------------------------------------------------------------
// 7. Build
(async () => {
    for (const p of pages) {
        try { await render(p); }
        catch (e) { console.error(`Failed ${p.url}`, e); }
    }
    server.close(() => {
        console.log('\nBuild complete! public/ folder is ready for GitHub Pages.');
        console.log('Run: npm run deploy');
    });
})();