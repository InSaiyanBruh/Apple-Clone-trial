const express = require('express');
const session = require("express-session");
const MongoStore = require("connect-mongo");
const bodyParser = require("body-parser");
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");
const User = require("./Models/User");
const fs = require('fs');
const https = require('https');

mongoose.connect("mongodb://localhost:27017/iPhone");
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Configure session with a long expiration time (e.g., 30 days)
app.use(session({
    secret: "mySecretKey",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: "mongodb://127.0.0.1:27017/minorProject" }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 } // 30 days
}));

// Add body-parser middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Google OAuth minimal backend using tokeninfo endpoint (top-level)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '289829610487-ntn4hdteq3om8aio1mh4ip00k7t7t51p.apps.googleusercontent.com';

function verifyGoogleIdToken(idToken) {
    return new Promise((resolve, reject) => {
        const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
        https.get(url, (resp) => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => {
                try {
                    const info = JSON.parse(data);
                    if (info.error_description || info.error) {
                        return reject(new Error(info.error_description || info.error));
                    }
                    if (info.aud !== GOOGLE_CLIENT_ID) {
                        return reject(new Error('Invalid audience'));
                    }
                    resolve({
                        googleId: info.sub,
                        email: info.email,
                        emailVerified: info.email_verified === 'true' || info.email_verified === true,
                        name: info.name,
                        picture: info.picture
                    });
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => reject(err));
    });
}

app.post('/auth/google', async (req, res) => {
    try {
        const { id_token } = req.body;
        if (!id_token) return res.status(400).json({ ok: false, message: 'Missing id_token' });

        const payload = await verifyGoogleIdToken(id_token);
        if (!payload.email) return res.status(400).json({ ok: false, message: 'Email not present in token' });

        let user = await User.findOne({ $or: [{ email: payload.email }, { googleId: payload.googleId }] });

        if (!user) {
            const base = (payload.name && payload.name.trim()) || payload.email.split('@')[0];
            let candidate = base.replace(/\s+/g, '').toLowerCase();
            if (!candidate) candidate = 'user';
            let suffix = 0;
            while (await User.findOne({ username: suffix ? `${candidate}${suffix}` : candidate })) {
                suffix++;
                if (suffix > 9999) break;
            }
            const username = suffix ? `${candidate}${suffix}` : candidate;

            user = new User({
                username,
                email: payload.email,
                password: null,
                googleId: payload.googleId,
                displayName: payload.name || username,
                avatar: payload.picture || null,
            });
        } else {
            if (!user.googleId) user.googleId = payload.googleId;
            if (payload.picture && user.avatar !== payload.picture) user.avatar = payload.picture;
            if (payload.name && user.displayName !== payload.name) user.displayName = payload.name;
        }

        await user.save();
        req.session.user = user;
        return res.json({ ok: true });
    } catch (err) {
        console.error('Google auth failed:', err);
        return res.status(400).json({ ok: false, message: 'Google authentication failed', error: String(err && err.message || err) });
    }
});

const formatProductName = (key) => {
    if (key.includes(' ')) return key;
    let name = key;
    name = name.replace(/^iPhone(\d+)/, 'iPhone $1');
    name = name.replace(/(\d+)ProMax$/, '$1 Pro Max');
    name = name.replace(/(\d+)Pro$/, '$1 Pro');
    name = name.replace(/(\d+)Plus$/, '$1 Plus');
    return name;
};

app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send("User already exists!");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();
        res.redirect("/"); // Redirect to home page after signup
    } catch (err) {
        console.log(err);
        res.send("Error signing up.");
    }
});

// Handle GET / to show home page with user status
app.get("/", (req, res) => {
    res.render("index", { user: req.session.user }); // Pass user data to template
});

// Handle GET /Login to show login page
app.get("/Login", (req, res) => {
    res.render("Login");
});

// Handle POST / for login
app.post("/", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.send("❌ User not found");

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.send("❌ Invalid password");

        // Save user in session
        req.session.user = user;
        res.redirect("/"); // Redirect to home page after login
    } catch (err) {
        console.log(err);
        res.send("Error logging in.");
    }
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            res.send("Error logging out.");
        } else {
            res.redirect("/");
        }
    });
});

app.get("/Accessories", (req, res) => {
    res.render("Accessories");
});

app.get("/All_Accessories", (req, res) => {
    try {
        const accessoriesPath = path.join(__dirname, 'Public', 'Data', 'All Accessories.json');
        const accessoriesRaw = fs.readFileSync(accessoriesPath, 'utf8');
        const accessoriesData = JSON.parse(accessoriesRaw);

        const resolveStaticPath = (p) => {
            if (!p) return null;
            if (/^https?:\/\//i.test(p)) return p;
            if (p.startsWith('/')) return p;
            return '/' + p.replace(/^(\.\/|(..\/)+)/, '');
        };

        const parsePriceToNumber = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
                const digits = val.replace(/[^0-9]/g, '');
                return digits ? parseInt(digits, 10) : 0;
            }
            return 0;
        };

        const defaultImage = '/pics/iphone-01.png';

        const slugify = (str) => {
            return String(str || '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
        };

        const products = (Array.isArray(accessoriesData) ? accessoriesData : [])
            .map((item, index) => {
                const name = item.product || item.name || `Accessory ${index + 1}`;
                const price = parsePriceToNumber(item.price);
                const image = resolveStaticPath(item.ProductImage || item.image) || defaultImage;
                return {
                    id: index + 1,
                    name,
                    price,
                    image,
                    badge: index === 0 ? 'New' : null,
                    slug: slugify(name)
                };
            });

        res.render("All_Accessories", { products });
    } catch (err) {
        console.error('Error loading accessories:', err);
        res.status(500).send('Error loading accessories');
    }
});

// Accessory product page route - displays individual accessory details
app.get('/accessory/:slug', (req, res) => {
    try {
        const slug = req.params.slug;
        const accessoriesPath = path.join(__dirname, 'Public', 'Data', 'All Accessories.json');
        const accessoriesData = JSON.parse(fs.readFileSync(accessoriesPath, 'utf8'));

        const resolveStaticPath = (p) => {
            if (!p) return null;
            if (/^https?:\/\//i.test(p)) return p;
            if (p.startsWith('/')) return p;
            return '/' + p.replace(/^(\.\/|(..\/)+)/, '');
        };
        const parsePriceToNumber = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
                const digits = val.replace(/[^0-9]/g, '');
                return digits ? parseInt(digits, 10) : 0;
            }
            return 0;
        };
        const slugify = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const list = Array.isArray(accessoriesData) ? accessoriesData : [];
        const found = list.find(it => slugify(it.product || it.name) === slug);
        if (!found) {
            return res.status(404).send('Accessory not found');
        }

        const product = {
            product: found.product || found.name || 'Accessory',
            description: found.description || '',
            price_starting: found.price || '',
            price_number: parsePriceToNumber(found.price),
            image: resolveStaticPath(found.image),
            ProductImage: resolveStaticPath(found.ProductImage) || resolveStaticPath(found.image),
            // Pass through known optional sections if present
            key_features: found.key_features || null,
            technical_specifications: found.technical_specifications || null,
            compatibility: found.compatibility || null,
            design_and_connectivity: found.design_and_connectivity || null,
            design_and_build: found.design_and_build || null,
            charging_and_connectivity: found.charging_and_connectivity || null,
            system_requirements_and_compatibility: found.system_requirements_and_compatibility || null,
            features: found.features || null,
        };

        res.render('AccessoryPage', { product });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading accessory');
    }
});

app.get("/Signup", (req, res) => {
    res.render("Signup");
});

app.get("/All_Products", (req, res) => {
    // Load products from JSON file
    const productsPath = path.join(__dirname, 'Public', 'Data', 'All_Products.json');
    const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    
    // Transform JSON data into array format for the template
    const resolveStaticPath = (p) => {
        if (!p) return null;
        if (/^https?:\/\//i.test(p)) return p;
        if (p.startsWith('/')) return p;
        return '/' + p.replace(/^(\.\/|(\.\.\/)+)/, '');
    };
    const products = Object.keys(productsData).map((key, index) => {
        const product = productsData[key];
        // Format name: "iPhone16" -> "iPhone 16", "iPhone16Plus" -> "iPhone 16 Plus"
        let formattedName = formatProductName(key);
        
        // Extract display info as string
        let displayInfo = '';
        if (product.display) {
            if (typeof product.display === 'string') {
                displayInfo = product.display;
            } else if (product.display.size && product.display.type) {
                displayInfo = `${product.display.size} ${product.display.type}`;
            } else if (product.display.size) {
                displayInfo = product.display.size;
            } else if (product.display.type) {
                displayInfo = product.display.type;
            }
        }
        
        // Extract chip info as string
        let chipInfo = '';
        if (product.chip) {
            if (typeof product.chip === 'string') {
                chipInfo = product.chip;
            } else if (product.chip.model) {
                chipInfo = product.chip.model;
            }
        }
        
        return {
            id: index + 1,
            productKey: key,
            name: formattedName,
            price: product.price,
            display: displayInfo,
            chip: chipInfo,
            description: product.description || '',
            camera: product.camera,
            colors: product.colors,
            storage_options: product.storage_options,
            ProductThumbnail: resolveStaticPath(product.ProductThumbnail) || null,
            badge: index === 0 ? "New" : null
        };
    });
    
    res.render("All_Products", { products });
});

// Product page route - displays individual product details
app.get('/product/:productKey', (req, res) => {
    try {
        const productKey = req.params.productKey;
        const productsPath = path.join(__dirname, 'Public', 'Data', 'All_Products.json');
        const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
        
        // Check if product exists
        if (!productsData[productKey]) {
            return res.status(404).send('Product not found');
        }
        
        const productData = productsData[productKey];
        
        // Format the product data for the ProductPage template
        // This handles the new JSON structure with proper fallbacks
        const resolveStaticPath = (p) => {
            if (!p) return null;
            if (/^https?:\/\//i.test(p)) return p;
            if (p.startsWith('/')) return p;
            return '/' + p.replace(/^(\.\/|(\.\.\/)+)/, '');
        };
        const product = {
            product: formatProductName(productKey),
            description: productData.description || `Experience the latest ${productKey} with cutting-edge technology`,
            price_starting: productData.price,
            image: resolveStaticPath(productData.image),
            ProductImage: resolveStaticPath(productData.ProductImage) || resolveStaticPath(productData.image),
            chip: productData.chip ? {
                model: productData.chip.model || productData.chip,
                cooling_system: productData.chip.cooling_system || null
            } : null,
            ram: productData.ram || '8GB',
            storage_options: productData.storage_options || [],
            battery: productData.battery ? {
                features: productData.battery.features || productData.battery.charging || productData.battery.fast_charge,
                capacity: productData.battery.capacity || productData.battery.type
            } : null,
            camera: productData.camera ? {
                rear: productData.camera.rear ? {
                    setup: productData.camera.rear.setup,
                    lenses: productData.camera.rear.lenses,
                    optical_zoom: productData.camera.rear.optical_zoom,
                    optical_quality_zoom: productData.camera.rear.optical_quality_zoom,
                    digital_zoom: productData.camera.rear.digital_zoom
                } : null,
                front: productData.camera.front ? {
                    resolution: productData.camera.front.resolution,
                    feature: productData.camera.front.feature,
                    type: productData.camera.front.type
                } : null
            } : null,
            display: productData.display ? {
                type: productData.display.type,
                size: productData.display.size,
                sizes: productData.display.sizes,
                features: productData.display.features || []
            } : null,
            operating_system: productData.operating_system ? {
                name: productData.operating_system.name,
                features: productData.operating_system.features || [],
                upgradeable_to: productData.operating_system.upgradeable_to
            } : null,
            connectivity: productData.connectivity ? {
                wifi: productData.connectivity.wifi,
                bluetooth: productData.connectivity.bluetooth,
                cellular: productData.connectivity.cellular || productData.connectivity.network
            } : null,
            build: productData.build ? {
                design: productData.build.design,
                frame: productData.build.frame,
                glass: productData.build.glass,
                finishes: productData.build.finishes,
                colors: productData.build.colors
            } : null,
            key_features: productData.key_features || [],
            audio: productData.audio || null
        };
        
        res.render('ProductPage', { product });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading product');
    }
});

app.get("/DeliveryAddress", (req, res) => {
    res.render("DeliveriAddressPage");
});

app.get("/Cart", (req, res) => {
    res.render("Cart");
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});