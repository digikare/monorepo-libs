<h1 align="center">
  DIGI<span style="color: #16a085;">K</span>ARE
</h1>
<h2 align="center">
monorepo-libs
</h2>

<p align="center">
  <a href="https://lerna.js.org/"><img src="https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg" alt="lerna" /></a>
</p>

<p>
  <a href="https://www.digikare.com">Digi<span>k</span>are</a> monorepo for open source librairies - contributions are welcome!
</p>

# requirements

- yarn
- node v12

# Dev

## Setup

```bash
$ yarn
$ yarn bootstrap
```

## How to create a new library

Create the folder name in `./packages` fodler with the wanted library name

```bash
$ cd ./packages
$ mkdir my_package_name
$ yarn init
```

## How to add a local package to an other

```bash
$ cd packages/{working_package_name}
$ npx lerna add @digikare/{dep_package_name} --scope=@digikare/{working_package_name}
```

## How to remove a dependency

```bash
$ lerna exec -- yarn remove {package_name}
```

## How to publish

```bash
$ lerna publish
```

# References

- https://medium.com/@jsilvax/a-workflow-guide-for-lerna-with-yarn-workspaces-60f97481149d
- https://samhogy.co.uk/2018/08/lerna-independent-mode-with-semver.html

# License

The librairies is under [MIT licensed](LICENSE).
