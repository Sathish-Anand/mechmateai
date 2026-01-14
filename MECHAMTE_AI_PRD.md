# 🚗 Mechmate AI | Product Requirements Document (PRD)

Mechmate AI is an AI-driven vehicle health assistant designed to bridge the gap between "weird car noises" and professional repair knowledge. It empowers DIYers and car owners to diagnose issues, track maintenance, and manage their "virtual garage."

## 1. Product Objective
To provide an affordable, AI-powered diagnostic tool that translates text/visual symptoms into actionable repair steps, while maintaining a comprehensive digital logbook for vehicle maintenance.

## 2. User Experience & Features

### Phase 1: The Core (Text-Based)
- **Landing Page (Guest Experience):**
  - Direct Diagnose: Input car details (Make, Model, Year, Variant, Odometer, Rego) + Text box for issue description.
  - Output: Blurred AI Result (requires login/plan to unlock) + Public YouTube repair videos + Affiliate links for common parts.
- **User Authentication:**
  - Login (Email/Pass/Reset) and Signup (Name, Age, Phone, Password).
- **Garage (Vehicle Management):**
  - Store multiple vehicles. Select a "Default Car" for one-tap diagnostics.
- **The Logbook:**
  - Select vehicle via dropdown.
  - View timeline of repairs/services.
  - Add Entry: Input date, service type, work done + Image upload for receipts/warranties.
- **Home Dashboard:**
  - Quick-action blocks: Diagnose, Garage, Logbook.
  - Displays current default vehicle stats.

### Phase 2: Advanced Intelligence
- **Multimodal Diagnosis:** Upload photos or 10-second videos of engine sounds/leaks for AI analysis.
- **Technical Library:** Integration of manufacturer manuals and electrical wiring diagrams for complex repairs.

## 3. Subscription & Monetization (The Plans)

| Tier | Limit | Pricing | Features |
|------|-------|---------|----------|
| Free | 1/week | $0 | Basic text diagnosis |
| Min | 10/day | $10 (one-time/periodic) | Full diagnosis + Logbook |
| Medium | 3/day | $20/year (billed annually) | Full diagnosis + Logbook |
| Max | Unlimited | $100/month | Priority AI + Manuals/Diagrams |

## 4. Technical Requirements

### Authentication System
- Email/password login
- User registration with name, age, phone
- Password reset functionality
- JWT-based authentication

### Vehicle Management (Garage)
- Add/edit/delete vehicles
- Store: Make, Model, Year, Variant, Odometer, Registration
- Set default vehicle for quick access
- Multiple vehicles per user

### Diagnostic System
- Text-based problem description
- AI-powered issue analysis
- YouTube video suggestions
- Parts/product recommendations with affiliate links
- Guest mode with blurred results

### Logbook System
- Service history tracking
- Repair records with photos
- Warranty information storage
- Timeline view of maintenance

### Subscription Management
- Tier-based access control
- Usage tracking and limits
- Payment integration (Stripe)
- Plan upgrade/downgrade

### Phase 2 Features
- Image analysis for visual diagnostics
- Video analysis (10-second clips)
- Technical manual integration
- Advanced AI diagnostics