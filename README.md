# n8n-nodes-wiza

An n8n community node for integrating with the [Wiza](https://wiza.co) contact enrichment API. Find email addresses, phone numbers, and LinkedIn profiles for your prospects using multiple data sources.

![Wiza Logo](https://wiza.co/favicon.png)

## Features

### 🔍 **Email Finder**
Find verified work and personal email addresses using:
- LinkedIn profile URLs
- Contact details (name + company/domain)
- Multiple data points for best results

### 📞 **Phone Finder**
Find mobile and direct dial phone numbers using:
- Email addresses
- LinkedIn profile URLs  
- Contact details (name + company/domain)
- Multiple data points for best results

### 💼 **LinkedIn Profile Finder**
Find LinkedIn profiles and extract key details using:
- Email addresses
- LinkedIn URLs (for enhanced profile data)
- Contact details (name + company/domain)
- Multiple data points for best results

## Installation

### Community Nodes (Recommended)

1. Go to **Settings > Community Nodes** in your n8n instance
2. Select **Install a community node**
3. Enter `n8n-nodes-wiza`
4. Click **Install**

### Manual Installation

```bash
# In your n8n root directory
npm install n8n-nodes-wiza
```

### Docker

```bash
# Using environment variable
N8N_NODES_INCLUDE=n8n-nodes-wiza

# Or in docker-compose.yml
environment:
  N8N_NODES_INCLUDE: "n8n-nodes-wiza"
```

## Setup

### 1. Get Your API Key

1. Sign up at [wiza.co](https://wiza.co)
2. Navigate to **Settings > API** 
3. Generate your API key

### 2. Configure Credentials

1. In n8n, go to **Credentials**
2. Click **Create New** 
3. Search for **Wiza API**
4. Enter your API key
5. Click **Save**

## Usage

### Basic Email Finding

```json
{
  "operation": "Email Finder",
  "inputType": "Contact Details", 
  "fullName": "John Doe",
  "company": "Acme Corp"
}
```

### Phone Number Lookup

```json
{
  "operation": "Phone Finder",
  "inputType": "Email",
  "email": "john@acme.com"
}
```

### LinkedIn Profile Enhancement

```json
{
  "operation": "LinkedIn Profile Finder", 
  "inputType": "All Fields",
  "email": "john@acme.com",
  "fullName": "John Doe",
  "company": "acme.com"
}
```

## Input Types

### 📧 **Email**
Provide an email address to find phone numbers or LinkedIn profiles.

### 🔗 **LinkedIn URL** 
Provide a LinkedIn profile URL to find emails, phone numbers, or enhanced profile data.

### 👤 **Contact Details**
Provide name and company/domain to find emails, phone numbers, or LinkedIn profiles.

### 🎯 **All Fields** *(Recommended)*
Provide any combination of email, LinkedIn URL, name, and company for best results. All fields are optional - the more data you provide, the better the results.

## Response Data

### Email Finder Response
```json
{
  "email": "john@acme.com",
  "email_type": "work", 
  "email_status": "valid",
  "name": "John Doe",
  "company": "Acme Corp",
  "title": "CEO",
  "linkedin_profile_url": "https://linkedin.com/in/johndoe"
}
```

### Phone Finder Response  
```json
{
  "phone_number": "+1234567890",
  "phone_status": "found",
  "mobile_phone": "+1234567890", 
  "name": "John Doe",
  "company": "Acme Corp",
  "email": "john@acme.com"
}
```

### LinkedIn Profile Finder Response
```json
{
  "linkedin_profile_url": "https://linkedin.com/in/johndoe",
  "name": "John Doe", 
  "title": "CEO",
  "company": "Acme Corp",
  "location": "New York, NY",
  "company_domain": "acme.com"
}
```

## Configuration Options

### **Timeout**
- **Default**: 300 seconds (5 minutes)
- **Description**: Maximum time to wait for enrichment completion
- **Range**: 30-600 seconds

### **Email Type** *(Email Finder only)*
- **Work**: Professional emails (john@company.com)
- **Personal**: Personal emails (john.doe@gmail.com) 
- **Any**: Both work and personal emails

## Error Handling

The node handles various error scenarios:

- **Invalid API Key**: Check your credentials
- **Rate Limiting**: Automatic retry with backoff
- **Timeout**: Enrichment took too long to complete
- **No Results**: No data found for the provided input
- **Invalid Input**: Missing required fields or invalid format

## Workflow Examples

### Lead Enrichment Pipeline
```
Webhook → Wiza Email Finder → Wiza Phone Finder → CRM Update
```

### LinkedIn Outreach Prep
```
CSV Import → Wiza LinkedIn Finder → Message Personalization → LinkedIn Automation
```

### Data Validation Flow
```
Database Query → Wiza Email Finder → Email Validation → Clean Database Update
```

## Support

- **Documentation**: [wiza.co/api-docs](https://wiza.co/api-docs)
- **Issues**: [GitHub Issues](https://github.com/WizaCo/n8n-nodes-wiza/issues)
- **Wiza Support**: hello@wiza.com

## License

[MIT](LICENSE.md)

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CODE_OF_CONDUCT.md) and submit pull requests to the main repository.

---

Made with ❤️ by the Wiza team
