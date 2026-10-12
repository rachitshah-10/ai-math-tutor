"""
Database access and SQLite schema management for InkMath.
Encapsulates table creation, initial data seeding, and transactional query operations.
"""

import json
import sqlite3
import os
from datetime import datetime
from typing import List, Optional, Dict, Any

DATABASE_PATH = os.path.join(os.path.dirname(__file__), "inkmath.db")


def get_connection() -> sqlite3.Connection:
    """
    Establish a connection to SQLite with row dictionary mapping and WAL mode.
    WAL mode prevents table lock contention during concurrent async reads and writes.
    """
    conn = sqlite3.connect(DATABASE_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def initialize_database() -> None:
    """
    Create necessary SQLite tables if they do not exist and seed default curriculum.
    """
    with get_connection() as conn:
        cursor = conn.cursor()

        # Topics catalog
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS topics (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                difficulty TEXT NOT NULL,
                question_count INTEGER NOT NULL
            );
        """)

        # Questions bank
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY,
                topic_id TEXT NOT NULL,
                order_index INTEGER NOT NULL,
                prompt TEXT NOT NULL,
                topic TEXT NOT NULL,
                max_points INTEGER NOT NULL,
                hint TEXT,
                rubric_solution TEXT NOT NULL,
                FOREIGN KEY (topic_id) REFERENCES topics (id)
            );
        """)

        # Student assignment attempts
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS attempts (
                id TEXT PRIMARY KEY,
                topic_id TEXT NOT NULL,
                total_score INTEGER DEFAULT 0,
                max_score INTEGER DEFAULT 0,
                completed INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (topic_id) REFERENCES topics (id)
            );
        """)

        # Per-question student submissions and AI evaluations
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS evaluations (
                id TEXT PRIMARY KEY,
                attempt_id TEXT NOT NULL,
                question_id TEXT NOT NULL,
                image_data TEXT NOT NULL,
                status TEXT NOT NULL,
                score INTEGER DEFAULT 0,
                max_points INTEGER NOT NULL,
                transcription TEXT,
                step_analysis TEXT,
                suggestions TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (attempt_id) REFERENCES attempts (id),
                FOREIGN KEY (question_id) REFERENCES questions (id)
            );
        """)

        conn.commit()

    # Seed pre-populated assignments
    seed_default_assignments()


def seed_default_assignments() -> None:
    """
    Seed standard curriculum assignments across Geometry, Fractions, and Algebra.
    Ensures the application launches with interactive content immediately.
    """
    topics_seed = [
        {
            "id": "geometry-angles",
            "title": "Geometry: Angles & Shapes",
            "description": "Triangle angle sums, right-angle properties, and rectangle dimensions.",
            "icon": "📐",
            "difficulty": "Intermediate",
            "questions": [
                {
                    "id": "geo-q1",
                    "order_index": 1,
                    "prompt": "In triangle ABC, angle A = 50° and angle B = 65°. Find the measure of angle C.",
                    "topic": "Triangle Angle Sum",
                    "max_points": 10,
                    "hint": "The interior angles of any triangle always add up to 180°.",
                    "rubric_solution": "1. Sum of known angles: 50° + 65° = 115°. 2. Interior angle sum: 180° - 115° = 65°. Final: Angle C = 65°."
                },
                {
                    "id": "geo-q2",
                    "order_index": 2,
                    "prompt": "A right-angled triangle has legs of length 3 cm and 4 cm. Find the length of the hypotenuse c using the Pythagorean theorem.",
                    "topic": "Pythagorean Theorem",
                    "max_points": 10,
                    "hint": "Recall that a² + b² = c².",
                    "rubric_solution": "1. Formula: a² + b² = c². 2. Substitute: 3² + 4² = 9 + 16 = 25. 3. Square root: c = √25 = 5 cm."
                },
                {
                    "id": "geo-q3",
                    "order_index": 3,
                    "prompt": "Calculate the area of a rectangle with length 8 cm and width 5 cm. Draw the shape and write out your steps.",
                    "topic": "Area of Rectangles",
                    "max_points": 10,
                    "hint": "Area = length × width.",
                    "rubric_solution": "1. Formula: Area = length × width. 2. Calculation: 8 × 5 = 40. 3. Final: 40 cm²."
                }
            ]
        },
        {
            "id": "fractions-basics",
            "title": "Fractions: Operations & Steps",
            "description": "Adding fractions with unequal denominators and simple multiplications.",
            "icon": "🍰",
            "difficulty": "Beginner",
            "questions": [
                {
                    "id": "frac-q1",
                    "order_index": 1,
                    "prompt": "Compute 1/3 + 1/6. Show your common denominator and simplify your final answer.",
                    "topic": "Fraction Addition",
                    "max_points": 10,
                    "hint": "Find the least common denominator between 3 and 6.",
                    "rubric_solution": "1. Common denominator is 6: 1/3 = 2/6. 2. Add: 2/6 + 1/6 = 3/6. 3. Simplify: 3/6 = 1/2."
                },
                {
                    "id": "frac-q2",
                    "order_index": 2,
                    "prompt": "Calculate 3/4 × 2/5. Express your final answer in simplest form.",
                    "topic": "Fraction Multiplication",
                    "max_points": 10,
                    "hint": "Multiply numerators together and denominators together.",
                    "rubric_solution": "1. Multiply numerators: 3 × 2 = 6. 2. Multiply denominators: 4 × 5 = 20. 3. Simplify: 6/20 = 3/10."
                }
            ]
        },
        {
            "id": "algebra-linear",
            "title": "Algebra: Linear Equations",
            "description": "Isolating variables, inverse operations, and algebraic balancing.",
            "icon": "⚡",
            "difficulty": "Advanced",
            "questions": [
                {
                    "id": "alg-q1",
                    "order_index": 1,
                    "prompt": "Solve for x: 3x + 7 = 22. Show both steps clearly on the scratchpad.",
                    "topic": "Two-Step Equations",
                    "max_points": 10,
                    "hint": "Subtract 7 from both sides first, then divide by 3.",
                    "rubric_solution": "1. Subtract 7 from both sides: 3x = 22 - 7 => 3x = 15. 2. Divide by 3: x = 15 / 3 = 5. Final: x = 5."
                },
                {
                    "id": "alg-q2",
                    "order_index": 2,
                    "prompt": "Solve for y: 2(y - 4) = 14.",
                    "topic": "Distributive Property",
                    "max_points": 10,
                    "hint": "Distribute the 2 across parentheses, or divide both sides by 2 first.",
                    "rubric_solution": "1. Method A: 2y - 8 = 14 => 2y = 22 => y = 11. (Or Method B: y - 4 = 7 => y = 11). Final: y = 11."
                }
            ]
        },
    ]

    with get_connection() as conn:
        cursor = conn.cursor()

        # Topics catalog
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS topics (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                difficulty TEXT NOT NULL,
                question_count INTEGER NOT NULL
            );
        """)

        # Questions bank
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY,
                topic_id TEXT NOT NULL,
                order_index INTEGER NOT NULL,
                prompt TEXT NOT NULL,
                topic TEXT NOT NULL,
                max_points INTEGER NOT NULL,
                hint TEXT,
                rubric_solution TEXT NOT NULL,
                FOREIGN KEY (topic_id) REFERENCES topics (id)
            );
        """)

        # Student assignment attempts
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS attempts (
                id TEXT PRIMARY KEY,
                topic_id TEXT NOT NULL,
                total_score INTEGER DEFAULT 0,
                max_score INTEGER DEFAULT 0,
                completed INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (topic_id) REFERENCES topics (id)
            );
        """)

        # Per-question student submissions and AI evaluations
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS evaluations (
                id TEXT PRIMARY KEY,
                attempt_id TEXT NOT NULL,
                question_id TEXT NOT NULL,
                image_data TEXT NOT NULL,
                status TEXT NOT NULL,
                score INTEGER DEFAULT 0,
                max_points INTEGER NOT NULL,
                transcription TEXT,
                step_analysis TEXT,
                suggestions TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (attempt_id) REFERENCES attempts (id),
                FOREIGN KEY (question_id) REFERENCES questions (id)
            );
        """)

        conn.commit()

    # Seed pre-populated assignments
    seed_default_assignments()


def seed_default_assignments() -> None:
    """
    Seed standard curriculum assignments across Geometry, Fractions, and Algebra.
    Ensures the application launches with interactive content immediately.
    """
    topics_seed = [
        {
            "id": "geometry-angles",
            "title": "Geometry: Angles & Shapes",
            "description": "Triangle angle sums, right-angle properties, and rectangle dimensions.",
            "icon": "📐",
            "difficulty": "Intermediate",
            "questions": [
                {
                    "id": "geo-q1",
                    "order_index": 1,
                    "prompt": "In triangle ABC, angle A = 50° and angle B = 65°. Find the measure of angle C.",
                    "topic": "Triangle Angle Sum",
                    "max_points": 10,
                    "hint": "The interior angles of any triangle always add up to 180°.",
                    "rubric_solution": "1. Sum of known angles: 50° + 65° = 115°. 2. Interior angle sum: 180° - 115° = 65°. Final: Angle C = 65°."
                },
                {
                    "id": "geo-q2",
                    "order_index": 2,
                    "prompt": "A right-angled triangle has legs of length 3 cm and 4 cm. Find the length of the hypotenuse c using the Pythagorean theorem.",
                    "topic": "Pythagorean Theorem",
                    "max_points": 10,
                    "hint": "Recall that a² + b² = c².",
                    "rubric_solution": "1. Formula: a² + b² = c². 2. Substitute: 3² + 4² = 9 + 16 = 25. 3. Square root: c = √25 = 5 cm."
                },
                {
                    "id": "geo-q3",
                    "order_index": 3,
                    "prompt": "Calculate the area of a rectangle with length 8 cm and width 5 cm. Draw the shape and write out your steps.",
                    "topic": "Area of Rectangles",
                    "max_points": 10,
                    "hint": "Area = length × width.",
                    "rubric_solution": "1. Formula: Area = length × width. 2. Calculation: 8 × 5 = 40. 3. Final: 40 cm²."
                }
            ]
        },
        {
            "id": "fractions-basics",
            "title": "Fractions: Operations & Steps",
            "description": "Adding fractions with unequal denominators and simple multiplications.",
            "icon": "🍰",
            "difficulty": "Beginner",
            "questions": [
                {
                    "id": "frac-q1",
                    "order_index": 1,
                    "prompt": "Compute 1/3 + 1/6. Show your common denominator and simplify your final answer.",
                    "topic": "Fraction Addition",
                    "max_points": 10,
                    "hint": "Find the least common denominator between 3 and 6.",
                    "rubric_solution": "1. Common denominator is 6: 1/3 = 2/6. 2. Add: 2/6 + 1/6 = 3/6. 3. Simplify: 3/6 = 1/2."
                },
                {
                    "id": "frac-q2",
                    "order_index": 2,
                    "prompt": "Calculate 3/4 × 2/5. Express your final answer in simplest form.",
                    "topic": "Fraction Multiplication",
                    "max_points": 10,
                    "hint": "Multiply numerators together and denominators together.",
                    "rubric_solution": "1. Multiply numerators: 3 × 2 = 6. 2. Multiply denominators: 4 × 5 = 20. 3. Simplify: 6/20 = 3/10."
                }
            ]
        },
        {
            "id": "algebra-linear",
            "title": "Algebra: Linear Equations",
            "description": "Isolating variables, inverse operations, and algebraic balancing.",
            "icon": "⚡",
            "difficulty": "Advanced",
            "questions": [
                {
                    "id": "alg-q1",
                    "order_index": 1,
                    "prompt": "Solve for x: 3x + 7 = 22. Show both steps clearly on the scratchpad.",
                    "topic": "Two-Step Equations",
                    "max_points": 10,
                    "hint": "Subtract 7 from both sides first, then divide by 3.",
                    "rubric_solution": "1. Subtract 7 from both sides: 3x = 22 - 7 => 3x = 15. 2. Divide by 3: x = 15 / 3 = 5. Final: x = 5."
                },
                {
                    "id": "alg-q2",
                    "order_index": 2,
                    "prompt": "Solve for y: 2(y - 4) = 14.",
                    "topic": "Distributive Property",
                    "max_points": 10,
                    "hint": "Distribute the 2 across parentheses, or divide both sides by 2 first.",
                    "rubric_solution": "1. Method A: 2y - 8 = 14 => 2y = 22 => y = 11. (Or Method B: y - 4 = 7 => y = 11). Final: y = 11."
                }
            ]
        },
        {
            "id": "algebra-systems",
            "title": "Grade 8: Systems of Linear Equations",
            "description": "Simultaneous 2-variable linear systems using elimination and substitution methods.",
            "icon": "⚖️",
            "difficulty": "Grade 8",
            "questions": [
                {
                    "id": "sys-q1",
                    "order_index": 1,
                    "prompt": "Solve the linear system using elimination: 2x + y = 9 and 3x - y = 16. Find both x and y.",
                    "topic": "Systems of Equations (Elimination)",
                    "max_points": 10,
                    "hint": "Add the two equations together so the y terms (+y and -y) cancel out.",
                    "rubric_solution": "1. Add equations: (2x + y) + (3x - y) = 9 + 16 => 5x = 25. 2. Solve for x: x = 5. 3. Substitute x = 5 into 2x + y = 9: 2(5) + y = 9 => 10 + y = 9 => y = -1. Final Solution: x = 5, y = -1 (or (5, -1))."
                },
                {
                    "id": "sys-q2",
                    "order_index": 2,
                    "prompt": "Solve using substitution: y = 2x - 1 and 4x + 3y = 27. State your solution as (x, y).",
                    "topic": "Systems of Equations (Substitution)",
                    "max_points": 10,
                    "hint": "Substitute the expression (2x - 1) in place of y into the second equation.",
                    "rubric_solution": "1. Substitute y: 4x + 3(2x - 1) = 27. 2. Distribute: 4x + 6x - 3 = 27 => 10x = 30 => x = 3. 3. Compute y: y = 2(3) - 1 = 5. Final Solution: (3, 5)."
                }
            ]
        },
        {
            "id": "quadratics-factoring",
            "title": "Grade 9: Quadratics & Factoring",
            "description": "Factoring trinomials, finding roots, and applying the quadratic formula.",
            "icon": "🎯",
            "difficulty": "Grade 9",
            "questions": [
                {
                    "id": "quad-q1",
                    "order_index": 1,
                    "prompt": "Solve the quadratic equation by factoring: x² - 5x + 6 = 0. Show the factored binomials and both roots.",
                    "topic": "Factoring Quadratic Trinomials",
                    "max_points": 10,
                    "hint": "Find two integers that multiply to 6 and add up to -5.",
                    "rubric_solution": "1. Factors of 6 that sum to -5: -2 and -3. 2. Factored form: (x - 2)(x - 3) = 0. 3. Set factors to zero: x - 2 = 0 or x - 3 = 0. Final Roots: x = 2, x = 3."
                },
                {
                    "id": "quad-q2",
                    "order_index": 2,
                    "prompt": "Use the quadratic formula x = (-b ± √(b² - 4ac)) / (2a) to solve: 2x² + 5x - 3 = 0. Calculate discriminant first.",
                    "topic": "The Quadratic Formula",
                    "max_points": 10,
                    "hint": "Identify a = 2, b = 5, c = -3. Calculate b² - 4ac before taking the square root.",
                    "rubric_solution": "1. Coefficients: a = 2, b = 5, c = -3. 2. Discriminant: b² - 4ac = 25 - 4(2)(-3) = 25 + 24 = 49. 3. Formula: x = (-5 ± √49) / (2 × 2) = (-5 ± 7) / 4. 4. Roots: x = (-5 + 7)/4 = 0.5 and x = (-5 - 7)/4 = -3. Final Roots: x = 0.5, x = -3."
                },
                {
                    "id": "quad-q3",
                    "order_index": 3,
                    "prompt": "Solve using difference of squares: 4x² - 49 = 0. Show all steps.",
                    "topic": "Difference of Squares",
                    "max_points": 10,
                    "hint": "Notice that (2x)² - 7² = 0. Factor using the pattern (a - b)(a + b) = 0.",
                    "rubric_solution": "1. Factor: (2x - 7)(2x + 7) = 0. 2. Solve each branch: 2x = 7 => x = 7/2; 2x = -7 => x = -7/2. Final: x = ±7/2 (or ±3.5)."
                }
            ]
        },
        {
            "id": "trigonometry-sohcahtoa",
            "title": "Grade 10: Trigonometry (SOH-CAH-TOA)",
            "description": "Right triangle ratios (sin, cos, tan), angle calculations, and real-world elevation modeling.",
            "icon": "📐",
            "difficulty": "Grade 10",
            "questions": [
                {
                    "id": "trig-q1",
                    "order_index": 1,
                    "prompt": "In a right triangle, angle θ has opposite side = 6 cm and hypotenuse = 10 cm. (a) Find sin(θ) in simplest fraction form. (b) Find the adjacent side using Pythagorean theorem.",
                    "topic": "Trigonometric Ratios & Pythagorean Theorem",
                    "max_points": 10,
                    "hint": "sin(θ) = Opposite / Hypotenuse. Also, adjacent² + opposite² = hypotenuse².",
                    "rubric_solution": "1. Ratio: sin(θ) = 6/10 = 3/5. 2. Pythagorean theorem: adj² + 6² = 10² => adj² + 36 = 100 => adj² = 64 => adjacent = 8 cm. Final: sin(θ) = 3/5, adjacent = 8 cm."
                },
                {
                    "id": "trig-q2",
                    "order_index": 2,
                    "prompt": "A 12-meter ladder leans against a building making a 60° angle with level ground. How high up the building does it reach? (Given: sin(60°) = √3 / 2 ≈ 0.866).",
                    "topic": "Trigonometric Applications (Elevation)",
                    "max_points": 10,
                    "hint": "The height is opposite the 60° angle, and the ladder is the hypotenuse: sin(60°) = height / 12.",
                    "rubric_solution": "1. Model: sin(60°) = height / 12 => height = 12 × sin(60°). 2. Exact value: height = 12 × (√3 / 2) = 6√3 m. 3. Decimal: ≈ 10.39 m. Final: 6√3 m (approx 10.39 m)."
                }
            ]
        },
        {
            "id": "coord-geometry",
            "title": "Grade 10: Analytic Geometry & Lines",
            "description": "Slope, midpoint formula, distance between points, and equation of lines in slope-intercept form.",
            "icon": "📈",
            "difficulty": "Grade 10",
            "questions": [
                {
                    "id": "coord-q1",
                    "order_index": 1,
                    "prompt": "Given points A(2, 3) and B(8, 11): (a) Find the slope m of segment AB. (b) Find the coordinates of the midpoint M.",
                    "topic": "Slope and Midpoint Formulas",
                    "max_points": 10,
                    "hint": "Slope m = (y₂ - y₁) / (x₂ - x₁). Midpoint = ((x₁ + x₂)/2, (y₁ + y₂)/2).",
                    "rubric_solution": "1. Slope: m = (11 - 3) / (8 - 2) = 8 / 6 = 4/3. 2. Midpoint: M = ((2 + 8)/2, (3 + 11)/2) = (10/2, 14/2) = (5, 7). Final: Slope = 4/3, Midpoint = (5, 7)."
                },
                {
                    "id": "coord-q2",
                    "order_index": 2,
                    "prompt": "Find the equation of the line passing through point (4, -1) with slope m = -2. Write in slope-intercept form (y = mx + b).",
                    "topic": "Equation of a Line (y = mx + b)",
                    "max_points": 10,
                    "hint": "Use y - y₁ = m(x - x₁) or plug point (4, -1) into y = mx + b to solve for y-intercept b.",
                    "rubric_solution": "1. Point-slope: y - (-1) = -2(x - 4) => y + 1 = -2x + 8. 2. Subtract 1: y = -2x + 7. Final: y = -2x + 7."
                }
            ]
        }
    ]

