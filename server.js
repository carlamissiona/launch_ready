import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join  } from 'path';
import { readFile } from 'fs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
 

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('view engine', 'ejs');
app.use(express.static(join(__dirname, 'public')));

// Initialize PostgreSQL client
const { Pool } = pg;
const pool = new Pool({
  user: "admin",
  host: "dpg-cugqr723esus73fg1egg-a.oregon-postgres.render.com",
  database: "launch_db",
  password: "yaHa2t9CtHNJBS1jKhn2Mzke5Jvca3PM",
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL database:', err);
  } else {
    console.log('Connected to PostgreSQL database');
    release();
  }
});

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Authentication middleware
const authenticateUser = (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    // return res.status(401).json({ error: 'Unauthorized: No token provided' });
    res.redirect('/login.html');
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("user id user id @ middleware ");
    req.user = decoded;
    console.log( req.user );
    console.log("user id user id-----------");
     
    next();
  } catch (error) {
    // If token is invalid then logout na theres eror msg = Cannot set headers after they are sent to the client
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

};

 
app.get('/register', (req, res) => {
   res.sendFile(join(__dirname, 'public', 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'login.html'));
});


app.get('/',  (req, res) => {
   res.sendFile(join(__dirname, 'public', 'index.html'));
     
});

app.post('/queryai', (req, res) => {
  const { text } = req.body;
  // let text = "What are the section of one page lean buisness plan";
  runaiquery("@cf/meta/llama-3-8b-instruct", {
          messages: [
              {
              role: "system",
              content: "You are a friendly assistan that helps answer topics on creating  lean canvas plan,business plan any business related knowledge",
              },
              {
              role: "user",
              content:
                  text,      
              },
          ],
      }).then((response) => {
        console.log("query ai worker");
          console.log(JSON.stringify(response));
          // return JSON.stringify(response);
          return res.status(200).json({ data: JSON.stringify(response) });
    });
  // res.sendFile(join(__dirname, 'public', 'register.html'));
});


app.get('/dashboard',authenticateUser, (req, res) => {
  res.sendFile(join(__dirname, 'public', 'dashboard.html'));
//
});

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { fullname, email, password, address, city, bio } = req.body;
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT email FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Generate verification token
    const verificationToken = uuidv4();
    
    // Create new user
    const newUser = await pool.query(
      `INSERT INTO users (
        uuid, fullname, email, password, address, city, bio, 
        paid_user, verification_token, is_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        uuidv4(),
        fullname,
        email,
        hashedPassword,
        address || '',
        city || '',
        bio || '',
        false,
        verificationToken,
        false
      ]
    );
    
    if (!newUser.rows[0]) {
      return res.status(500).json({ error: 'Failed to create user' });
    }
    
    // Send verification email
    /**
    const verificationUrl = `http://${req.headers.host}/api/verify?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Email Verification',
      html: `
        <h1>Verify Your Email</h1>
        <p>Thank you for registering. Please click the link below to verify your email:</p>
        <a href="${verificationUrl}">Verify Email</a>
      `
    };
    
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Error sending email:', err);
      } else {
        console.log('Verification email sent:', info.response);
      }
    }); **/
    
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Email verification
app.get('/api/verify', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).send('Verification token is required');
    }
    
    // Find user with the verification token
    const user = await pool.query(
      'SELECT * FROM users WHERE verification_token = $1',
      [token]
    );
    
    if (user.rows.length === 0) {
      return res.status(400).send('Invalid verification token');
    }
    
    // Update user as verified
    await pool.query(
      'UPDATE users SET is_verified = true, verification_token = NULL WHERE uuid = $1',
      [user.rows[0].uuid]
    );
    
    res.redirect('/login.html?verified=true');
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).send('Server error');
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is verified
    if (!user.is_verified) {
      return res.status(401).json({ error: 'Please verify your email before logging in' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.uuid, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Update login session
    const loginSession = uuidv4();
    await pool.query(
      'UPDATE users SET login_session = $1 WHERE uuid = $2',
      [loginSession, user.uuid]
    );
    
    // Set token as cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.uuid,
        fullname: user.fullname,
        email: user.email,
        paid_user: user.paid_user
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User logout
app.post('/api/logout', authenticateUser, async (req, res) => {

  try {
    // Clear login session in database
    await pool.query(
      'UPDATE users SET login_session = NULL WHERE uuid = $1',
      [req.user.id]
    );
    
    // Clear cookie
    res.clearCookie('token');
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});



// Get user profile
app.get('/api/profile', authenticateUser, async (req, res) => {
  console.log("profile =");
  console.log("profile =");
  console.log(req.body);
  
  try {
    const result = await pool.query(
      'SELECT uuid, fullname, email, address, city, bio, paid_user FROM users WHERE uuid = $1',
      [req.user.id]
    );
    
    const user = result.rows[0];
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
app.put('/api/profile', authenticateUser, async (req, res) => {
  try {
    const { fullname, address, city, bio } = req.body;
    console.log(req.body);

    const result = await pool.query(
      `UPDATE users 
       SET fullname = $1, address = $2, city = $3, bio = $4, updated_at = NOW() 
       WHERE uuid = $5 
       RETURNING uuid, fullname, email, address, city, bio, paid_user`,
      [fullname, address, city, bio, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// FORM CRUD OPERATIONS

// Create form
app.post('/api/forms', authenticateUser, async (req, res) => {
  try {
    const { description, type, formcontent, isDraft } = req.body;
    
    const result = await pool.query(
      `INSERT INTO forms (uuid, user_id, description, type, formcontent, isdraft)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [uuidv4(), req.user.id, description, type, formcontent, isDraft || true]
    );
    
    res.status(201).json({ message: 'Form created successfully', form: result.rows[0] });
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all forms for user
app.get('/api/forms', authenticateUser, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM forms WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single form
app.get('/api/forms/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM forms WHERE uuid = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update form
app.put('/api/forms/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, type, formcontent, isDraft } = req.body;
    
    // Check if form belongs to user
    const existingForm = await pool.query(
      'SELECT * FROM forms WHERE uuid = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (existingForm.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found or unauthorized' });
    }
    
    const result = await pool.query(
      `UPDATE forms 
       SET description = $1, type = $2, formcontent = $3, isdraft = $4, updated_at = NOW() 
       WHERE uuid = $5 AND user_id = $6 
       RETURNING *`,
      [description, type, formcontent, isDraft, id, req.user.id]
    );
    
    res.json({ message: 'Form updated successfully', form: result.rows[0] });
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete form
app.delete('/api/forms/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if form belongs to user
    const existingForm = await pool.query(
      'SELECT * FROM forms WHERE uuid = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (existingForm.rows.length === 0) {
      return res.status(404).json({ error: 'Form not found or unauthorized' });
    }
    
    await pool.query(
      'DELETE FROM forms WHERE uuid = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});



async function runaiquery(model, input) {
      const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/9d8cf0bed724c974cfd216a9e2eafcb6/ai/run/${model}`,
          {
          headers: { Authorization: "Bearer KgG9F7VJLE0tgkrVW2DslW4yVTy_orBcYkWkMkmJ" },
          method: "POST",
          body: JSON.stringify(input),
          }
      );
      const result = await response.json();
      return result;
  }




// Database initialization script
const initializeDatabase = async () => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        uuid uuid PRIMARY KEY,
        fullname character varying(300) NOT NULL,
        email character varying(100) UNIQUE NOT NULL,
        password text NOT NULL,
        address character varying(1000) DEFAULT '',
        city character varying(100) DEFAULT '',
        bio character varying(2000) DEFAULT '',
        paid_user boolean DEFAULT false,
        verification_token text,
        is_verified boolean DEFAULT false,
        login_session character varying(1000),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    
    // Create forms table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forms (
        uuid uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
        description character varying(1000) NOT NULL,
        type character varying(100) NOT NULL,
        formcontent text NOT NULL,
        isdraft boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
  }
};

// Initialize database tables when server starts
initializeDatabase();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// functions
app.get('/answer/form',  authenticateUser , async (req, res) => {
  
  const dbres = await pool.query('SELECT * FROM forms WHERE user_id::text = $1', [req.user.id]);
  // SELECT * FROM example_table WHERE id::text = '123e4567-e89b-12d3-a456-426614174000';
  let formshtml = "-" ;
  console.log("formshtml");
  //  res.rows[0][data];
  console.log( dbres.rowCount );
  if( dbres.rowCount == 0 ){
      formshtml = "No forms found"
  }else{
    console.log(dbres.rows[0].formcontent);
    formshtml = dbres.rows[0].formcontent;
  }
console.log("======formshtml");
console.log(formshtml);
  let data = {
    title: 'Form',
    forms: formshtml,
  };

	res.render('add_form', {
		page: data,
	});

});

app.get('/home', async (req, res) => {
    
  //get businessplans
  //get apps
  //get courses 
  //forms answered
   // Check if user already exists
   const bplan = await pool.query('SELECT * FROM forms' );
   const apps = await pool.query('SELECT *  FROM forms' );
   const forms = await pool.query('SELECT *  FROM forms' );
   


   let plans = [{
    title: 'Bplan1',
    image: 'A computer science portal for geeks image',
    bplans: 'https://www.geeksforgeeks.org/',
  }, 
  {

    title: 'Bplan2',
    image: 'A computer science portal for geeks image',
    bplans: 'https://www.geeksforgeeks.org/',
  }
];

let saasapp = [{
  title: 'App',
  image: 'A computer science portal for geeks image',
  bplans: 'https://www.geeksforgeeks.org/',
}, 
{

  title: 'App2',
  image: 'A computer science portal for geeks image',
  bplans: 'https://www.geeksforgeeks.org/',
}
];


  let data = {
    title: 'Home',
    forms: 'A computer science portal for geeks',
    bplans: plans,
    apps: saasapp,
  };

	res.render('home', {
		page: data,
	});

});

 