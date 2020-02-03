[![Build Status](https://travis-ci.org/JelteMX/mendix-dynamic-table.svg?branch=master)](https://travis-ci.org/JelteMX/mendix-dynamic-table)
[![Coverage Status](https://coveralls.io/repos/github/JelteMX/mendix-dynamic-table/badge.svg?branch=master)](https://coveralls.io/github/JelteMX/mendix-dynamic-table?branch=master)
[![Dependencies](https://david-dm.org/JelteMX/mendix-dynamic-table.svg)]([https://david-dm.org/JelteMX/mendix-dynamic-table](https://david-dm.org/JelteMX/mendix-dynamic-table))
[![DevDependencies](https://david-dm.org/JelteMX/mendix-dynamic-table/dev-status.svg)]([https://david-dm.org/JelteMX/mendix-dynamic-table?type=dev](https://david-dm.org/JelteMX/mendix-dynamic-table?type=dev))
[![Support](https://img.shields.io/badge/Support-Community%20(no%20active%20support)-orange.svg)](https://docs.mendix.com/developerportal/app-store/app-store-content-support)
[![Studio](https://img.shields.io/badge/Studio%20version-8.0%2B-blue.svg)](https://appstore.home.mendix.com/link/modeler/)
[![GitHub release](https://img.shields.io/github/release/JelteMX/mendix-dynamic-table)](https://github.com/JelteMX/mendix-dynamic-table/releases/latest)
[![GitHub issues](https://img.shields.io/github/issues/JelteMX/mendix-dynamic-table)](https://github.com/JelteMX/mendix-dynamic-table/issues)
[![DeepScan grade](https://deepscan.io/api/teams/7221/projects/9346/branches/120493/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=7221&pid=9346&bid=120493)

## Dynamic (Tree) Table for Mendix

Mendix Dynamic (Tree) Table using [Ant Design Table](https://ant.design/components/table/) (MIT License). This is inspired on the [Tree Table widget](https://appstore.home.mendix.com/link/app/111095/), but takes objects in the columns as well.

![logo](/assets/AppStoreIcon.png)

Show a reference table. Rows & Columns are Mendix objects, Entry objects are in between.

![screenshot](/assets/screenshot.png)

> See test-project [https://dynamictabletest-sandbox.mxapps.io/](https://dynamictabletest-sandbox.mxapps.io/) for a live demo! On the bottom of this page there is a short explanation of the Domain model that is used.

> Missing features? See TODO at the bottom to see which items are still on the TODO list. If you find other bugs, please report this as an issue [here](https://github.com/JelteMX/mendix-dynamic-table/issues)

## Features

- Display a tree structure in a table
- Data Sources: XPath, Microflow, Nanoflow
- Children: Get over reference, Microflow, Nanoflow
- Selection of rows (single, multi)
- Events: Click/Double click on Row, Column, Entry or empty field

> This widget is about 580Kb uncompressed, so in your cloud deployment this widget should take about 150 Kb of network resources

Tested:

- IE11 & Edge
- Chrome
- Firefox
- Safari

## Basic Configuration

### 1. Row

![settings](/assets/settings1.png)

- Rows can be retrieved over XPath, Microflows and Nanoflows
- Your title can be purely text or HTML, either through the attribute or Nanoflow. Make sure you sanitize any user input to prevent XSS issues.

### 2. Row Children

![settings](/assets/settings2.png)

- This is totally optional. If you want to do a tree structure, please configure the children
- You can either get these over a Child reference (see bottom for explanation) or through a Microflow/Nanoflow when using a hasChildren attribute

### 3. Column

![settings](/assets/settings3.png)

- Columns can be retrieved over XPath, Microflows and Nanoflows
- Your title can be purely text or HTML, either through the attribute or Nanoflow. Make sure you sanitize any user input to prevent XSS issues.

### 4. Entries

![settings](/assets/settings4.png)

- An Entry is an object that is linked to 1 row and 1 column
- An Entry has a title (see Column/Row title, same principle)
- In order to retrieve entries, you will need to use a Data Helper (see next)

### 5. Data Helper

![settings](/assets/settings5.png)

- See explanation in the settings screen

### 6. Selection

![settings](/assets/settings6.png)

### 7. Events

![settings](/assets/settings7.png)

### 8. UI Settings

![settings](/assets/settings8.png)

## Demo project

[https://dynamictabletest-sandbox.mxapps.io/](https://dynamictabletest-sandbox.mxapps.io/)

### Domain Model

This demo uses the following domain model:

![domain model](/assets/domain-model.png)

Short explanation:

- A table is placed inside a data view with a `View` object
- For the first rows, it will get all `Rows` that have a reference to `View` and `_Root = true`
- Every row might have children. You either get these over a reference `Children`, or when you use a Microflow and `_hasChildren = true`
- `Column` Objects also have a reference to View, although it is not entirely necessary
- When loading `Entry` object, the widget will create a `EntryHelper` object that has references to the shown Rows&Columns. This helper is passed down to a microflow/nanoflow
- When the `Entry` objects are loaded, the widget will place these in the correct field based on the reference to a Column/Row
- The `SelectionHelper` is used for selections, but this is based on the test-project and can be disregarded here.

## Issues, suggestions and feature requests

Please report your issues [here](https://github.com/JelteMX/mendix-dynamic-table/issues)

## TODO

The following things need to be further tested and/or fixed. Please don't report this as a bug if this is in the TODO list:

- Basic WebModeler preview + settings
- Add Icon attribute (from Tree Table)
- Add config for when context changes (reload rows?)
- Column overflow (first column)
- Header height
- Left column lock issue with header. This is when locking the left column, it can get out of sync with the header.
- Unit tests

## License

Apache 2
