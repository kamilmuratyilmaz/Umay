# Contributing to Umay

Umay is a multilingual language learning app powered by Google Gemini. Community contributions are welcome — here are a few ground rules that keep the project healthy.

## License

The project is licensed under the **MIT License**. See [LICENSE](./LICENSE).

By submitting a contribution, you agree that your code will be released under the **MIT License**. Practical implications:

- Anyone (you, the maintainer, third parties) may use the code in commercial or closed-source products.
- The only obligation is to preserve the copyright notice and license text in distributed copies.
- You **retain the copyright** to your contribution — you simply license it to everyone under MIT. Nobody, including the maintainer, can relicense your contribution without your consent.

## Contribution Process

1. **Open an issue** — for anything non-trivial, let's discuss first (architecture, new feature, scope).
2. **Fork + branch** — name branches `feat/xxx`, `fix/xxx`, `docs/xxx`.
3. **Small, focused PRs** — one PR should do one thing.
4. **Tests** — `npm test` must pass; new features are expected to ship with tests.
5. **Lint** — `npm run lint` must be clean (TypeScript type-check).

## Development Environment

See [README.md](./README.md) and [CLAUDE.md](./CLAUDE.md) for setup and run instructions.

## Commit Message Format

We use Conventional Commits:

```
<type>(<scope>): <summary>

<optional body>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`.

## Code of Conduct

Be respectful, constructive, and patient. Personal attacks, harassment, and discrimination are not tolerated.

## Questions?

Open an issue or join an existing discussion.
