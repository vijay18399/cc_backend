const express = require('express');
const sequelize = require('./database');
const cors = require('cors'); // Import cors
require('dotenv').config(); // Load environment variables
require('./models/associations');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const superRoutes = require('./routes/super');
const companyRoutes = require('./routes/companies');
const dashboardRoutes = require('./routes/dashboard');
const { User } = require('./models/associations');
const bcrypt = require('bcryptjs');
const port = process.env.PORT || 3000;
const app = express();
app.use(express.json()); // Middleware to parse JSON bodies
app.use(cors()); // Use cors middleware
app.use('/uploads', express.static('uploads')); // Serve uploads statically

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  res.send('Hello, College Connect Backend!');
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/super', superRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/skills', require('./routes/skills'));
app.use('/api/search', require('./routes/search'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/support', require('./routes/support'));

// Function to create a default Super Admin
const createSuperAdmin = async () => {
  try {
    const existingSuperAdmin = await User.findOne({ where: { role: 'SUPER_ADMIN' } });
    if (existingSuperAdmin) {
      console.log('Super Admin already exists.');
      return;
    }

    const { SUPER_ADMIN_USERNAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD } = process.env;
    if (!SUPER_ADMIN_USERNAME || !SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
      console.error('Super Admin credentials not found in .env file. Please set SUPER_ADMIN_USERNAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD.');
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, salt);

    await User.create({
      username: SUPER_ADMIN_USERNAME,
      email: SUPER_ADMIN_EMAIL,
      passwordHash: passwordHash,
      role: 'SUPER_ADMIN',
      collegeId: null // Super Admins are not associated with a college
    });
    console.log('Default Super Admin created successfully.');
  } catch (error) {
    console.error('Error creating Super Admin:', error);
  }
};


sequelize.sync({ alter: false }).then(() => { // Use alter: true for development
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    createSuperAdmin(); // Create Super Admin after DB sync
  });
}).catch(error => {
  console.error('Unable to connect to the database:', error);
});
