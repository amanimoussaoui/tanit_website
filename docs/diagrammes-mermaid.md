# Diagrammes de séquence (style simple)

Coller chaque bloc (de ` ```mermaid ` à ` ``` `) sur [mermaid.live](https://mermaid.live).

---

## 1. Connexion

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant API
    participant DB

    User->>Browser: email + mot de passe
    Browser->>API: POST /api/auth/login
    API->>DB: vérifier compte
    DB-->>API: ok
    API-->>Browser: cookie JWT + user
    Browser-->>User: accès dashboard
```

---

## 2. Upload CV + score IA

```mermaid
sequenceDiagram
    participant Candidat
    participant Frontend
    participant API
    participant Fichiers
    participant IA
    participant DB

    Candidat->>Frontend: PDF
    Frontend->>API: POST /api/cv/upload
    API->>Fichiers: enregistrer
    API->>API: extraire texte
    API->>IA: POST /score
    IA-->>API: score + skills + feedback
    API->>DB: maj profil candidat
    API-->>Frontend: JSON
    Frontend-->>Candidat: afficher score
```

---

## 3. Candidature

```mermaid
sequenceDiagram
    participant Candidat
    participant Frontend
    participant API
    participant DB

    Candidat->>Frontend: postuler
    Frontend->>API: POST /api/applications
    API->>DB: INSERT Application
    DB-->>API: ok
    API-->>Frontend: confirmation
    Frontend-->>Candidat: succès
```

---

## 4. Offre recruteur

```mermaid
sequenceDiagram
    participant Recruteur
    participant Frontend
    participant API
    participant DB

    Recruteur->>Frontend: formulaire offre
    Frontend->>API: POST /api/jobs
    API->>DB: INSERT Job
    DB-->>API: ok
    API-->>Frontend: offre créée
    Frontend-->>Recruteur: confirmation
```

---

## 5. Chat IA

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant IA

    User->>Frontend: message
    Frontend->>API: POST /api/ai/chat
    API->>IA: POST /chat
    IA-->>API: réponse
    API-->>Frontend: reply
    Frontend-->>User: afficher
```

---

## Exemple minimal (test)

```mermaid
sequenceDiagram
    participant Alice
    participant Bob

    Bob->>Alice: Hi Alice
    Alice->>Bob: Hi Bob
```
