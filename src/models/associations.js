const College = require('./college');
const User = require('./user');
const Profile = require('./profile');
const Company = require('./company');
const Experience = require('./experience');
const Skill = require('./skill');
const UserSkill = require('./userSkill');
const Tag = require('./tag');
const CompanyTag = require('./companyTag');

const Post = require('./post');
const Like = require('./like');
const Comment = require('./comment');
const Portfolio = require('./portfolio');
const SupportTicket = require('./supportTicket');
const TicketComment = require('./ticketComment');

// College - User (One-to-Many)
College.hasMany(User, { foreignKey: 'collegeId', onDelete: 'SET NULL' });
User.belongsTo(College, { foreignKey: 'collegeId' });

// User - Profile (One-to-One)
User.hasOne(Profile, { foreignKey: 'userId', onDelete: 'CASCADE' });
Profile.belongsTo(User, { foreignKey: 'userId' });

// User - Experience (One-to-Many)
User.hasMany(Experience, { foreignKey: 'userId', onDelete: 'CASCADE' });
Experience.belongsTo(User, { foreignKey: 'userId' });

// Company - Experience (One-to-Many)
Company.hasMany(Experience, { foreignKey: 'companyId', onDelete: 'SET NULL' });
Experience.belongsTo(Company, { foreignKey: 'companyId' });

// User - Skill (Many-to-Many)
User.belongsToMany(Skill, { through: UserSkill, foreignKey: 'userId', otherKey: 'skillId' });
Skill.belongsToMany(User, { through: UserSkill, foreignKey: 'skillId', otherKey: 'userId' });

// Explicit UserSkill relationships for direct querying
UserSkill.belongsTo(User, { foreignKey: 'userId' });
UserSkill.belongsTo(Skill, { foreignKey: 'skillId' });
User.hasMany(UserSkill, { foreignKey: 'userId' });
Skill.hasMany(UserSkill, { foreignKey: 'skillId' });

// Company - Tag (Many-to-Many)
Company.belongsToMany(Tag, { through: CompanyTag, foreignKey: 'companyId', otherKey: 'tagId' });
Tag.belongsToMany(Company, { through: CompanyTag, foreignKey: 'tagId', otherKey: 'companyId' });

// Feed/Post Associations
// User - Post
User.hasMany(Post, { foreignKey: 'userId', onDelete: 'CASCADE' });
Post.belongsTo(User, { foreignKey: 'userId' });

// College - Post
College.hasMany(Post, { foreignKey: 'collegeId', onDelete: 'CASCADE' });
Post.belongsTo(College, { foreignKey: 'collegeId' });

// Post - Like
Post.hasMany(Like, { foreignKey: 'postId', onDelete: 'CASCADE' });
Like.belongsTo(Post, { foreignKey: 'postId' });

// User - Like
User.hasMany(Like, { foreignKey: 'userId', onDelete: 'CASCADE' });
Like.belongsTo(User, { foreignKey: 'userId' });

// Post - Comment
Post.hasMany(Comment, { foreignKey: 'postId', onDelete: 'CASCADE' });
Comment.belongsTo(Post, { foreignKey: 'postId' });

// User - Comment
User.hasMany(Comment, { foreignKey: 'userId', onDelete: 'CASCADE' });
Comment.belongsTo(User, { foreignKey: 'userId' });

// User - Portfolio
User.hasMany(Portfolio, { foreignKey: 'userId', onDelete: 'CASCADE' });
Portfolio.belongsTo(User, { foreignKey: 'userId' });

// Support Ticket Associations
User.hasMany(SupportTicket, { foreignKey: 'userId', onDelete: 'CASCADE' });
SupportTicket.belongsTo(User, { foreignKey: 'userId' });

College.hasMany(SupportTicket, { foreignKey: 'collegeId', onDelete: 'CASCADE' });
SupportTicket.belongsTo(College, { foreignKey: 'collegeId' });

SupportTicket.hasMany(TicketComment, { foreignKey: 'ticketId', onDelete: 'CASCADE' });
TicketComment.belongsTo(SupportTicket, { foreignKey: 'ticketId' });

User.hasMany(TicketComment, { foreignKey: 'userId', onDelete: 'CASCADE' });
TicketComment.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  College,
  User,
  Profile,
  Company,
  Experience,
  Skill,
  UserSkill,
  Tag,
  CompanyTag,
  Post,
  Like,
  Comment,
  Portfolio,
  SupportTicket,
  TicketComment
};